-- Message 5/6: rapports, import/export, documents Google Drive et contrôles financiers

create index if not exists financial_transactions_project_date_idx on public.financial_transactions(project_id, transaction_date desc);
create index if not exists documents_project_idx on public.documents(project_id, created_at desc);
create index if not exists documents_contact_idx on public.documents(contact_id, created_at desc);

create or replace view public.company_financial_summary as
select
  company_id,
  coalesce(sum(case when type in ('income','customer_payment','transfer_in') then amount else 0 end),0) as total_income,
  coalesce(sum(case when type in ('expense','supplier_payment','refund','transfer_out') then amount else 0 end),0) as total_expense,
  coalesce(sum(case when type in ('customer_payment') then amount else 0 end),0) as customer_payments,
  coalesce(sum(case when type in ('supplier_payment') then amount else 0 end),0) as supplier_payments
from public.financial_transactions
where company_id = public.my_company_id()
group by company_id;

create or replace view public.company_stock_summary as
select
  company_id,
  count(*) filter (where is_active) as active_items,
  coalesce(sum(stock_quantity * purchase_price) filter (where is_active and is_stockable),0) as stock_purchase_value,
  count(*) filter (where is_active and is_stockable and stock_quantity <= min_stock_quantity) as low_stock_items,
  count(*) filter (where is_active and is_stockable and stock_quantity <= 0) as out_of_stock_items
from public.items
where company_id = public.my_company_id()
group by company_id;

create or replace view public.company_sales_summary as
select
  company_id,
  count(*) filter (where document_type='invoice' and status <> 'cancelled') as invoice_count,
  coalesce(sum(total) filter (where document_type='invoice' and status <> 'cancelled'),0) as invoiced_total,
  coalesce(sum(amount_paid) filter (where document_type='invoice' and status <> 'cancelled'),0) as collected_total,
  coalesce(sum(total-amount_paid) filter (where document_type='invoice' and status <> 'cancelled'),0) as receivable_total
from public.sales
where company_id = public.my_company_id()
group by company_id;

create or replace view public.company_purchase_summary as
select
  company_id,
  count(*) as purchase_count,
  coalesce(sum(total) filter (where status <> 'cancelled'),0) as purchased_total,
  coalesce(sum(amount_paid) filter (where status <> 'cancelled'),0) as paid_total,
  coalesce(sum(total-amount_paid) filter (where status <> 'cancelled'),0) as payable_total
from public.purchases
where company_id = public.my_company_id()
group by company_id;

revoke all on public.company_financial_summary, public.company_stock_summary, public.company_sales_summary, public.company_purchase_summary from anon;
grant select on public.company_financial_summary, public.company_stock_summary, public.company_sales_summary, public.company_purchase_summary to authenticated;

-- Sécurité : empêcher une transaction de référencer un compte d'une autre entreprise.
create or replace function public.validate_financial_transaction_company()
returns trigger language plpgsql security definer set search_path=public as $$
declare account_company uuid;
begin
  select company_id into account_company from financial_accounts where id=new.account_id;
  if account_company is null or account_company <> new.company_id then raise exception 'Compte financier incompatible avec l’entreprise'; end if;
  if new.contact_id is not null and not exists(select 1 from contacts where id=new.contact_id and company_id=new.company_id) then raise exception 'Contact incompatible avec l’entreprise'; end if;
  if new.project_id is not null and not exists(select 1 from projects where id=new.project_id and company_id=new.company_id) then raise exception 'Chantier incompatible avec l’entreprise'; end if;
  return new;
end $$;

drop trigger if exists validate_financial_transaction_company_trigger on public.financial_transactions;
create trigger validate_financial_transaction_company_trigger before insert on public.financial_transactions for each row execute function public.validate_financial_transaction_company();
