-- Message 7: rôles, permissions métier et contrôle d'accès administratif
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path=public
as $$
  select role from public.profiles where id = auth.uid() limit 1
$$;

create or replace function public.is_admin_or_director()
returns boolean
language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director'), false)
$$;

create or replace function public.can_manage_finance()
returns boolean
language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director','accountant','cashier'), false)
$$;

create or replace function public.can_manage_stock()
returns boolean
language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director','warehouse'), false)
$$;

create or replace function public.can_manage_sales()
returns boolean
language sql stable security definer set search_path=public
as $$
  select coalesce(public.current_user_role() in ('admin','director','sales'), false)
$$;

-- Les changements de rôle sont réservés aux administrateurs/directeurs.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read company profiles" on public.profiles
for select using (company_id = public.my_company_id());

create policy "admins update company profiles" on public.profiles
for update using (company_id = public.my_company_id() and public.is_admin_or_director())
with check (company_id = public.my_company_id());

-- Les opérations financières directes ne sont autorisées qu'aux profils habilités.
drop policy if exists "members all transactions" on public.financial_transactions;
create policy "authorized finance transactions" on public.financial_transactions
for select using (company_id = public.my_company_id());
create policy "authorized finance transaction insert" on public.financial_transactions
for insert with check (company_id = public.my_company_id() and public.can_manage_finance());

-- L'administration de l'entreprise est réservée à admin/director.
drop policy if exists "members all company settings" on public.company_settings;
create policy "members read company settings" on public.company_settings
for select using (company_id = public.my_company_id());
create policy "admins manage company settings" on public.company_settings
for all using (company_id = public.my_company_id() and public.is_admin_or_director())
with check (company_id = public.my_company_id());
