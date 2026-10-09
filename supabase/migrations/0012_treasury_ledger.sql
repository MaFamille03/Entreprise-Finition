-- Trésorerie : journal par compte, observations, création de comptes et virements atomiques.

alter table public.financial_transactions
  add column if not exists observation text;

alter table public.financial_accounts
  add column if not exists opening_balance_date date not null default current_date;

-- Pour les comptes déjà présents, la date de création est une meilleure approximation
-- de la date d'ouverture que la date du déploiement de cette migration.
update public.financial_accounts
set opening_balance_date = created_at::date
where opening_balance_date = current_date;

-- Reconstitue le solde comptable depuis le solde initial et les mouvements existants.
update public.financial_accounts a
set current_balance = a.opening_balance + coalesce((
  select sum(case
    when t.type in ('income','customer_payment','transfer_in') then t.amount
    when t.type in ('expense','supplier_payment','refund','transfer_out') then -t.amount
    else 0
  end)
  from public.financial_transactions t
  where t.account_id = a.id and t.company_id = a.company_id and t.transaction_date >= a.opening_balance_date
), 0);

create or replace function public.create_financial_account(
  p_company_id uuid,
  p_name text,
  p_type public.account_type,
  p_opening_balance numeric default 0,
  p_opening_balance_date date default current_date
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if p_company_id is distinct from public.my_company_id() or not public.can_manage_finance() then
    raise exception 'Vous n’êtes pas autorisé à créer un compte financier';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Le nom du compte est obligatoire'; end if;
  if p_opening_balance is null then raise exception 'Le solde initial est obligatoire'; end if;
  insert into public.financial_accounts(company_id,name,type,opening_balance,current_balance,opening_balance_date)
  values(p_company_id,trim(p_name),p_type,p_opening_balance,p_opening_balance,coalesce(p_opening_balance_date,current_date))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_treasury_movement(
  p_company_id uuid,
  p_account_id uuid,
  p_type public.transaction_type,
  p_amount numeric,
  p_label text,
  p_transaction_date date default current_date,
  p_reference text default null,
  p_observation text default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if p_company_id is distinct from public.my_company_id() or not public.can_manage_finance() then
    raise exception 'Vous n’êtes pas autorisé à enregistrer ce mouvement';
  end if;
  if p_type not in ('income','expense','other') then
    raise exception 'Type de mouvement invalide : choisissez une entrée ou une sortie';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant doit être supérieur à zéro'; end if;
  if nullif(trim(p_label), '') is null then raise exception 'La désignation est obligatoire'; end if;
  if not exists(select 1 from public.financial_accounts where id=p_account_id and company_id=p_company_id and is_active) then
    raise exception 'Compte financier introuvable ou inactif';
  end if;
  insert into public.financial_transactions(company_id,account_id,type,amount,label,transaction_date,reference,observation,created_by)
  values(p_company_id,p_account_id,p_type,p_amount,trim(p_label),coalesce(p_transaction_date,current_date),nullif(trim(p_reference),''),nullif(trim(p_observation),''),auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_treasury_transfer(
  p_company_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric,
  p_transaction_date date default current_date,
  p_reference text default null,
  p_observation text default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_reference text;
begin
  if p_company_id is distinct from public.my_company_id() or not public.can_manage_finance() then
    raise exception 'Vous n’êtes pas autorisé à effectuer ce virement';
  end if;
  if p_source_account_id = p_destination_account_id then raise exception 'Les comptes source et destination doivent être différents'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant doit être supérieur à zéro'; end if;
  if not exists(select 1 from public.financial_accounts where id=p_source_account_id and company_id=p_company_id and is_active) then raise exception 'Compte source introuvable ou inactif'; end if;
  if not exists(select 1 from public.financial_accounts where id=p_destination_account_id and company_id=p_company_id and is_active) then raise exception 'Compte destination introuvable ou inactif'; end if;
  v_reference := nullif(trim(p_reference),'');
  insert into public.financial_transactions(company_id,account_id,type,amount,label,transaction_date,reference,observation,created_by)
  values(p_company_id,p_source_account_id,'transfer_out',p_amount,'Virement vers un autre compte',coalesce(p_transaction_date,current_date),v_reference,nullif(trim(p_observation),''),auth.uid())
  returning id into v_id;
  insert into public.financial_transactions(company_id,account_id,type,amount,label,transaction_date,reference,observation,created_by)
  values(p_company_id,p_destination_account_id,'transfer_in',p_amount,'Virement depuis un autre compte',coalesce(p_transaction_date,current_date),v_reference,nullif(trim(p_observation),''),auth.uid());
  return v_id;
end;
$$;

revoke all on function public.create_financial_account(uuid,text,public.account_type,numeric,date) from public, anon;
revoke all on function public.record_treasury_movement(uuid,uuid,public.transaction_type,numeric,text,date,text,text) from public, anon;
revoke all on function public.record_treasury_transfer(uuid,uuid,uuid,numeric,date,text,text) from public, anon;
grant execute on function public.create_financial_account(uuid,text,public.account_type,numeric,date) to authenticated;
grant execute on function public.record_treasury_movement(uuid,uuid,public.transaction_type,numeric,text,date,text,text) to authenticated;
grant execute on function public.record_treasury_transfer(uuid,uuid,uuid,numeric,date,text,text) to authenticated;

create or replace function public.update_financial_account_opening_balance(
  p_company_id uuid,
  p_account_id uuid,
  p_opening_balance numeric,
  p_opening_balance_date date
) returns void
language plpgsql security invoker set search_path=public as $$
begin
  if p_company_id is distinct from public.my_company_id() or not public.can_manage_finance() then
    raise exception 'Vous n’êtes pas autorisé à modifier le solde initial';
  end if;
  if p_opening_balance is null or p_opening_balance_date is null then
    raise exception 'Le montant et la date du solde initial sont obligatoires';
  end if;
  update public.financial_accounts
  set opening_balance=p_opening_balance,
      opening_balance_date=p_opening_balance_date,
      current_balance=p_opening_balance + coalesce((
        select sum(case
          when t.type in ('income','customer_payment','transfer_in') then t.amount
          when t.type in ('expense','supplier_payment','refund','transfer_out') then -t.amount
          else 0
        end)
        from public.financial_transactions t
        where t.account_id=p_account_id and t.company_id=p_company_id and t.transaction_date >= p_opening_balance_date
      ),0)
  where id=p_account_id and company_id=p_company_id and is_active;
  if not found then raise exception 'Compte financier introuvable ou inactif'; end if;
end;
$$;
revoke all on function public.update_financial_account_opening_balance(uuid,uuid,numeric,date) from public, anon;
grant execute on function public.update_financial_account_opening_balance(uuid,uuid,numeric,date) to authenticated;
