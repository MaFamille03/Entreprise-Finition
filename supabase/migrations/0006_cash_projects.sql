-- Message 5: trésorerie, dépenses et rentabilité chantier
create type public.expense_category as enum ('transport','labor','subcontracting','materials','rent','utilities','taxes','maintenance','marketing','other');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  category public.expense_category not null default 'other',
  reference text,
  label text not null,
  amount numeric(14,2) not null check(amount > 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_company_date_idx on public.expenses(company_id, expense_date desc);

create table public.project_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null check(category in ('material','labor','subcontracting','expense','other')),
  description text not null,
  amount numeric(14,2) not null check(amount >= 0),
  source_expense_id uuid references public.expenses(id) on delete set null,
  stock_movement_id uuid references public.stock_movements(id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_costs_project_idx on public.project_costs(project_id, created_at desc);

create or replace function public.apply_financial_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type in ('income','customer_payment','transfer_in') then
    update financial_accounts set current_balance = current_balance + new.amount where id = new.account_id;
  elsif new.type in ('expense','supplier_payment','refund','transfer_out') then
    update financial_accounts set current_balance = current_balance - new.amount where id = new.account_id;
  end if;
  return new;
end $$;

drop trigger if exists financial_transaction_balance_trigger on public.financial_transactions;
create trigger financial_transaction_balance_trigger
after insert on public.financial_transactions
for each row execute function public.apply_financial_transaction();

create or replace function public.record_expense(
  p_company_id uuid, p_account_id uuid, p_project_id uuid, p_contact_id uuid,
  p_category public.expense_category, p_label text, p_amount numeric,
  p_expense_date date default current_date, p_reference text default null, p_notes text default null
) returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
  if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
  if p_amount <= 0 then raise exception 'Le montant doit être supérieur à zéro'; end if;
  insert into public.expenses(company_id,account_id,project_id,contact_id,category,label,amount,expense_date,reference,notes,created_by)
  values(p_company_id,p_account_id,p_project_id,p_contact_id,p_category,p_label,p_amount,coalesce(p_expense_date,current_date),p_reference,p_notes,auth.uid())
  returning id into v_id;
  insert into public.financial_transactions(company_id,account_id,contact_id,project_id,type,amount,label,transaction_date,reference,created_by)
  values(p_company_id,p_account_id,p_contact_id,p_project_id,'expense',p_amount,p_label,coalesce(p_expense_date,current_date),p_reference,auth.uid());
  if p_project_id is not null then
    insert into public.project_costs(company_id,project_id,category,description,amount,source_expense_id)
    values(p_company_id,p_project_id,case when p_category='subcontracting' then 'subcontracting' else 'expense' end,p_label,p_amount,v_id);
  end if;
  return v_id;
end $$;

create or replace function public.record_project_material_cost(p_company_id uuid, p_project_id uuid, p_stock_movement_id uuid)
returns uuid language plpgsql security invoker as $$
declare r record; v_id uuid;
begin
  if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
  select sm.quantity, sm.unit_cost, i.name into r from public.stock_movements sm join public.items i on i.id=sm.item_id
  where sm.id=p_stock_movement_id and sm.company_id=p_company_id and sm.project_id=p_project_id;
  if not found then raise exception 'Mouvement de stock introuvable'; end if;
  if exists(select 1 from project_costs where stock_movement_id=p_stock_movement_id) then
    select id into v_id from project_costs where stock_movement_id=p_stock_movement_id limit 1; return v_id;
  end if;
  insert into project_costs(company_id,project_id,category,description,amount,stock_movement_id)
  values(p_company_id,p_project_id,'material',r.name,r.quantity*r.unit_cost,p_stock_movement_id) returning id into v_id;
  return v_id;
end $$;

create or replace view public.project_financial_summary as
select p.id as project_id, p.company_id, p.reference, p.name, p.budget,
  coalesce((select sum(s.total) from sales s where s.project_id=p.id and s.document_type='invoice' and s.status<>'cancelled'),0) as revenue,
  coalesce((select sum(pc.amount) from project_costs pc where pc.project_id=p.id),0) as cost,
  coalesce((select sum(s.total) from sales s where s.project_id=p.id and s.document_type='invoice' and s.status<>'cancelled'),0)
  - coalesce((select sum(pc.amount) from project_costs pc where pc.project_id=p.id),0) as margin
from projects p;

alter table public.expenses enable row level security;
alter table public.project_costs enable row level security;
create policy expenses_company_policy on public.expenses using (company_id=public.my_company_id()) with check (company_id=public.my_company_id());
create policy project_costs_company_policy on public.project_costs using (company_id=public.my_company_id()) with check (company_id=public.my_company_id());

revoke all on public.project_financial_summary from anon;
grant select on public.project_financial_summary to authenticated;
grant execute on function public.record_expense(uuid,uuid,uuid,uuid,public.expense_category,text,numeric,date,text,text) to authenticated;
grant execute on function public.record_project_material_cost(uuid,uuid,uuid) to authenticated;

create or replace function public.auto_project_material_cost()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type='project_consumption' and new.project_id is not null then
    perform public.record_project_material_cost(new.company_id,new.project_id,new.id);
  end if;
  return new;
end $$;

drop trigger if exists project_material_cost_trigger on public.stock_movements;
create trigger project_material_cost_trigger
after insert on public.stock_movements
for each row execute function public.auto_project_material_cost();
