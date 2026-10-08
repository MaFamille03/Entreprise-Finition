-- Finition ERP — fondations métier complémentaires

create type public.numbering_document_type as enum ('quote','order','delivery_note','invoice','credit_note','purchase','project','stock_movement','financial_transaction');

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  default_payment_terms_days integer not null default 30 check (default_payment_terms_days >= 0),
  default_vat_rate numeric(5,2) not null default 18 check (default_vat_rate >= 0 and default_vat_rate <= 100),
  low_stock_alert_enabled boolean not null default true,
  negative_stock_allowed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.document_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type public.numbering_document_type not null,
  prefix text not null,
  next_number bigint not null default 1 check (next_number > 0),
  padding integer not null default 4 check (padding between 1 and 12),
  reset_yearly boolean not null default true,
  current_year integer not null default extract(year from current_date)::integer,
  unique(company_id, document_type)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  unique(company_id, code),
  unique(company_id, name)
);

alter table public.company_settings enable row level security;
alter table public.document_sequences enable row level security;
alter table public.payment_methods enable row level security;

create policy "members all company settings" on public.company_settings for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all document sequences" on public.document_sequences for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all payment methods" on public.payment_methods for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());

create trigger company_settings_updated_at before update on public.company_settings for each row execute function public.set_updated_at();

create or replace function public.next_document_reference(p_company_id uuid, p_document_type public.numbering_document_type)
returns text language plpgsql security invoker as $$
declare
  v_seq public.document_sequences%rowtype;
  v_number bigint;
  v_year integer := extract(year from current_date)::integer;
  v_ref text;
begin
  if p_company_id <> public.my_company_id() then
    raise exception 'Entreprise non autorisée';
  end if;

  insert into public.document_sequences(company_id, document_type, prefix)
  values (p_company_id, p_document_type,
    case p_document_type
      when 'quote' then 'DEV'
      when 'order' then 'CMD'
      when 'delivery_note' then 'BL'
      when 'invoice' then 'FAC'
      when 'credit_note' then 'AV'
      when 'purchase' then 'ACH'
      when 'project' then 'CH'
      when 'stock_movement' then 'STK'
      when 'financial_transaction' then 'FIN'
    end)
  on conflict (company_id, document_type) do nothing;

  select * into v_seq from public.document_sequences
  where company_id = p_company_id and document_type = p_document_type
  for update;

  if v_seq.reset_yearly and v_seq.current_year <> v_year then
    update public.document_sequences
      set next_number = 2, current_year = v_year
    where id = v_seq.id;
    v_number := 1;
  else
    v_number := v_seq.next_number;
    update public.document_sequences set next_number = next_number + 1 where id = v_seq.id;
  end if;

  v_ref := v_seq.prefix || '-' || v_year::text || '-' || lpad(v_number::text, v_seq.padding, '0');
  return v_ref;
end $$;

create or replace function public.bootstrap_company(p_name text, p_full_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'Utilisateur non authentifié'; end if;
  if exists(select 1 from public.profiles where id=auth.uid() and company_id is not null) then
    raise exception 'Cet utilisateur possède déjà une entreprise';
  end if;

  insert into public.companies(name) values(trim(p_name)) returning id into v_company_id;
  update public.profiles set company_id=v_company_id, role='admin', full_name=coalesce(nullif(trim(p_full_name),''),full_name) where id=auth.uid();
  insert into public.company_settings(company_id) values(v_company_id);
  insert into public.payment_methods(company_id,name,code) values
    (v_company_id,'Espèces','CASH'),
    (v_company_id,'Virement bancaire','BANK_TRANSFER'),
    (v_company_id,'Mobile Money','MOBILE_MONEY'),
    (v_company_id,'Chèque','CHEQUE');
  insert into public.financial_accounts(company_id,name,type) values
    (v_company_id,'Caisse principale','cash'),
    (v_company_id,'Banque principale','bank'),
    (v_company_id,'Mobile Money','mobile_money');
  return v_company_id;
end $$;

create or replace function public.ensure_company_defaults()
returns void language plpgsql security invoker as $$
declare v_company uuid;
begin
  v_company := public.my_company_id();
  if v_company is null then return; end if;
  insert into public.company_settings(company_id) values(v_company) on conflict do nothing;
  insert into public.payment_methods(company_id,name,code) values
    (v_company,'Espèces','CASH'), (v_company,'Virement bancaire','BANK_TRANSFER'),
    (v_company,'Mobile Money','MOBILE_MONEY'), (v_company,'Chèque','CHEQUE')
  on conflict do nothing;
end $$;

-- Empêche qu'une ligne de vente/achat référence un article d'une autre entreprise.
create or replace function public.validate_line_item_company() returns trigger language plpgsql as $$
declare v_company uuid; v_item_company uuid;
begin
  if tg_table_name = 'sale_lines' then
    select company_id into v_company from public.sales where id=new.sale_id;
  else
    select company_id into v_company from public.purchases where id=new.purchase_id;
  end if;
  if new.item_id is not null then
    select company_id into v_item_company from public.items where id=new.item_id;
    if v_item_company is null or v_item_company <> v_company then raise exception 'Article appartenant à une autre entreprise'; end if;
  end if;
  return new;
end $$;

create trigger validate_sale_line_item_company before insert or update on public.sale_lines for each row execute function public.validate_line_item_company();
create trigger validate_purchase_line_item_company before insert or update on public.purchase_lines for each row execute function public.validate_line_item_company();

-- Contrôles sur les mouvements de stock.
create or replace function public.validate_stock_movement_company() returns trigger language plpgsql as $$
declare v_item_company uuid;
begin
  select company_id into v_item_company from public.items where id=new.item_id;
  if v_item_company is null or v_item_company <> new.company_id then
    raise exception 'Article appartenant à une autre entreprise';
  end if;
  return new;
end $$;

create or replace function public.prevent_negative_stock() returns trigger language plpgsql as $$
declare v_allowed boolean; v_stock numeric;
begin
  select coalesce(cs.negative_stock_allowed,false) into v_allowed
  from public.company_settings cs where cs.company_id=new.company_id;
  if not v_allowed and new.type in ('sale','project_consumption','adjustment_out','return_out','transfer_out') then
    select stock_quantity into v_stock from public.items where id=new.item_id for update;
    if coalesce(v_stock,0) < new.quantity then
      raise exception 'Stock insuffisant pour cet article (disponible: %, demandé: %)', coalesce(v_stock,0), new.quantity;
    end if;
  end if;
  return new;
end $$;

create trigger validate_stock_movement_company before insert or update on public.stock_movements for each row execute function public.validate_stock_movement_company();
create trigger prevent_negative_stock_before before insert on public.stock_movements for each row execute function public.prevent_negative_stock();

-- Vue pratique pour les alertes de stock.
create or replace view public.low_stock_items as
select i.*,
       case when i.stock_quantity <= 0 then 'out_of_stock' when i.stock_quantity <= i.min_stock_quantity then 'low' else 'ok' end as stock_status
from public.items i
where i.is_active = true and i.stock_quantity <= i.min_stock_quantity;
