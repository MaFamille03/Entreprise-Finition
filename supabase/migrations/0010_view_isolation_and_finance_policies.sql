-- Finition ERP — isolation inter-entreprises des vues et durcissement financier

-- Les vues doivent toujours filtrer l'entreprise courante même lorsqu'elles sont exécutées
-- avec les droits de leur propriétaire PostgreSQL.
create or replace view public.low_stock_items as
select i.*,
       case
         when i.stock_quantity <= 0 then 'out_of_stock'
         when i.stock_quantity <= i.min_stock_quantity then 'low'
         else 'ok'
       end as stock_status
from public.items i
where i.company_id = public.my_company_id()
  and i.is_active = true
  and i.stock_quantity <= i.min_stock_quantity;

create or replace view public.project_financial_summary as
select p.id as project_id,
       p.company_id,
       p.reference,
       p.name,
       p.budget,
       coalesce((select sum(s.total)
                 from public.sales s
                 where s.project_id=p.id
                   and s.company_id=p.company_id
                   and s.document_type='invoice'
                   and s.status<>'cancelled'),0) as revenue,
       coalesce((select sum(pc.amount)
                 from public.project_costs pc
                 where pc.project_id=p.id
                   and pc.company_id=p.company_id),0) as cost,
       coalesce((select sum(s.total)
                 from public.sales s
                 where s.project_id=p.id
                   and s.company_id=p.company_id
                   and s.document_type='invoice'
                   and s.status<>'cancelled'),0)
       - coalesce((select sum(pc.amount)
                   from public.project_costs pc
                   where pc.project_id=p.id
                     and pc.company_id=p.company_id),0) as margin
from public.projects p
where p.company_id = public.my_company_id();

revoke all on public.low_stock_items, public.project_financial_summary from anon;
grant select on public.low_stock_items, public.project_financial_summary to authenticated;

-- Comptes financiers : lecture aux membres, modification à la finance/direction.
drop policy if exists "members all accounts" on public.financial_accounts;
create policy "accounts read allowed" on public.financial_accounts
for select using (company_id = public.my_company_id());
create policy "accounts write allowed" on public.financial_accounts
for all using (company_id = public.my_company_id() and public.can_manage_finance())
with check (company_id = public.my_company_id() and public.can_manage_finance());

-- Catégories de stock : lecture aux membres, modification au magasin/direction.
drop policy if exists "members all categories" on public.categories;
create policy "categories read allowed" on public.categories
for select using (company_id = public.my_company_id());
create policy "categories write allowed" on public.categories
for all using (company_id = public.my_company_id() and public.can_manage_stock())
with check (company_id = public.my_company_id() and public.can_manage_stock());
