-- Finition ERP — durcissement des permissions par rôle

create or replace function public.can_manage_purchases()
returns boolean language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director','accountant','warehouse'), false)
$$;

create or replace function public.can_manage_projects()
returns boolean language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director','sales','site_manager'), false)
$$;

create or replace function public.can_manage_contacts()
returns boolean language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director','sales','accountant','cashier','site_manager'), false)
$$;

-- Ventes : lecture aux équipes métier, écriture aux profils commerciaux/direction.
drop policy if exists "members all sales" on public.sales;
create policy "sales read allowed" on public.sales
for select using (company_id = public.my_company_id());
create policy "sales insert allowed" on public.sales
for insert with check (company_id = public.my_company_id() and public.can_manage_sales());
create policy "sales update allowed" on public.sales
for update using (company_id = public.my_company_id() and public.can_manage_sales())
with check (company_id = public.my_company_id() and public.can_manage_sales());

-- Lignes de vente : elles suivent les droits d'écriture du document parent.
drop policy if exists "members all sale lines" on public.sale_lines;
create policy "sale lines read allowed" on public.sale_lines
for select using (exists(select 1 from public.sales s where s.id=sale_id and s.company_id=public.my_company_id()));
create policy "sale lines write allowed" on public.sale_lines
for all using (exists(select 1 from public.sales s where s.id=sale_id and s.company_id=public.my_company_id() and public.can_manage_sales()))
with check (exists(select 1 from public.sales s where s.id=sale_id and s.company_id=public.my_company_id() and public.can_manage_sales()));

-- Achats : lecture aux membres, écriture aux achats/finance/stock/direction.
drop policy if exists "members all purchases" on public.purchases;
create policy "purchases read allowed" on public.purchases
for select using (company_id = public.my_company_id());
create policy "purchases insert allowed" on public.purchases
for insert with check (company_id = public.my_company_id() and public.can_manage_purchases());
create policy "purchases update allowed" on public.purchases
for update using (company_id = public.my_company_id() and public.can_manage_purchases())
with check (company_id = public.my_company_id() and public.can_manage_purchases());

-- Lignes d'achat.
drop policy if exists "members all purchase lines" on public.purchase_lines;
create policy "purchase lines read allowed" on public.purchase_lines
for select using (exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.my_company_id()));
create policy "purchase lines write allowed" on public.purchase_lines
for all using (exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.my_company_id() and public.can_manage_purchases()))
with check (exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.my_company_id() and public.can_manage_purchases()));

-- Articles : lecture à tous les membres, modification au magasin/direction.
drop policy if exists "members all items" on public.items;
create policy "items read allowed" on public.items
for select using (company_id = public.my_company_id());
create policy "items write allowed" on public.items
for all using (company_id = public.my_company_id() and public.can_manage_stock())
with check (company_id = public.my_company_id() and public.can_manage_stock());

-- Mouvements de stock : lecture aux membres, écriture au magasin/direction.
drop policy if exists "members all stock movements" on public.stock_movements;
create policy "stock movements read allowed" on public.stock_movements
for select using (company_id = public.my_company_id());
create policy "stock movements write allowed" on public.stock_movements
for all using (company_id = public.my_company_id() and public.can_manage_stock())
with check (company_id = public.my_company_id() and public.can_manage_stock());

-- Projets/chantiers.
drop policy if exists "members all projects" on public.projects;
create policy "projects read allowed" on public.projects
for select using (company_id = public.my_company_id());
create policy "projects write allowed" on public.projects
for all using (company_id = public.my_company_id() and public.can_manage_projects())
with check (company_id = public.my_company_id() and public.can_manage_projects());

-- Contacts : tous les profils métier peuvent consulter, les profils habilités peuvent modifier.
drop policy if exists "members write contacts" on public.contacts;
create policy "contacts write allowed" on public.contacts
for all using (company_id = public.my_company_id() and public.can_manage_contacts())
with check (company_id = public.my_company_id() and public.can_manage_contacts());

-- Dépenses et coûts de chantier : finance/direction.
drop policy if exists expenses_company_policy on public.expenses;
create policy expenses_read_allowed on public.expenses
for select using (company_id = public.my_company_id());
create policy expenses_write_allowed on public.expenses
for all using (company_id = public.my_company_id() and public.can_manage_finance())
with check (company_id = public.my_company_id() and public.can_manage_finance());

drop policy if exists project_costs_company_policy on public.project_costs;
create policy project_costs_read_allowed on public.project_costs
for select using (company_id = public.my_company_id());
create policy project_costs_write_allowed on public.project_costs
for all using (company_id = public.my_company_id() and (public.can_manage_finance() or public.can_manage_projects()))
with check (company_id = public.my_company_id() and (public.can_manage_finance() or public.can_manage_projects()));

-- Les séquences de numérotation ne doivent pas être éditables par les utilisateurs courants.
drop policy if exists "members all document sequences" on public.document_sequences;
create policy "members read document sequences" on public.document_sequences
for select using (company_id = public.my_company_id());
create policy "admins manage document sequences" on public.document_sequences
for all using (company_id = public.my_company_id() and public.is_admin_or_director())
with check (company_id = public.my_company_id() and public.is_admin_or_director());

-- Les moyens de paiement sont des paramètres d'administration.
drop policy if exists "members all payment methods" on public.payment_methods;
create policy "members read payment methods" on public.payment_methods
for select using (company_id = public.my_company_id());
create policy "admins manage payment methods" on public.payment_methods
for all using (company_id = public.my_company_id() and public.is_admin_or_director())
with check (company_id = public.my_company_id() and public.is_admin_or_director());

-- Les documents Drive restent lisibles par l'entreprise, leur gestion est réservée à la direction.
drop policy if exists "members all documents" on public.documents;
create policy "documents read allowed" on public.documents
for select using (company_id = public.my_company_id());
create policy "documents write allowed" on public.documents
for all using (company_id = public.my_company_id() and public.is_admin_or_director())
with check (company_id = public.my_company_id() and public.is_admin_or_director());

-- Les connexions Google Drive sont strictement administratives.
drop policy if exists "members all drive connections" on public.google_drive_connections;
create policy "drive connections read allowed" on public.google_drive_connections
for select using (company_id = public.my_company_id());
create policy "drive connections write allowed" on public.google_drive_connections
for all using (company_id = public.my_company_id() and public.is_admin_or_director())
with check (company_id = public.my_company_id() and public.is_admin_or_director());
