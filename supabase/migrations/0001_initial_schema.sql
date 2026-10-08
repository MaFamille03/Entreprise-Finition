-- Finition ERP — schéma initial
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin','director','sales','cashier','warehouse','accountant','site_manager');
create type public.contact_type as enum ('client','prospect','supplier','provider','subcontractor','other');
create type public.document_status as enum ('draft','validated','partially_paid','paid','cancelled');
create type public.purchase_status as enum ('draft','ordered','partially_received','received','cancelled');
create type public.project_status as enum ('prospect','quote','pending','accepted','preparation','in_progress','suspended','completed','cancelled');
create type public.account_type as enum ('cash','bank','mobile_money','other');
create type public.transaction_type as enum ('income','expense','transfer_in','transfer_out','customer_payment','supplier_payment','refund','other');
create type public.stock_movement_type as enum ('purchase','sale','project_consumption','adjustment_in','adjustment_out','return_in','return_out','transfer_in','transfer_out');
create type public.item_type as enum ('material','product','service');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  address text,
  city text default 'Abidjan',
  country text default 'Côte d''Ivoire',
  phone text,
  email text,
  tax_id text,
  registration_id text,
  currency text not null default 'XOF',
  vat_rate numeric(5,2) not null default 18,
  google_drive_root_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  role public.user_role not null default 'sales',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type public.contact_type not null,
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  tax_id text,
  notes text,
  credit_limit numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_company_type_idx on public.contacts(company_id,type);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(company_id,name)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  sku text,
  name text not null,
  item_type public.item_type not null default 'material',
  unit text not null default 'pcs',
  purchase_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 18,
  stock_quantity numeric(14,3) not null default 0,
  min_stock_quantity numeric(14,3) not null default 0,
  is_stockable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,sku)
);
create index items_company_category_idx on public.items(company_id,category_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.contacts(id) on delete set null,
  reference text not null,
  name text not null,
  address text,
  description text,
  status public.project_status not null default 'prospect',
  start_date date,
  expected_end_date date,
  actual_end_date date,
  budget numeric(14,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,reference)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  reference text not null,
  document_type text not null check (document_type in ('quote','order','delivery_note','invoice','credit_note')),
  status public.document_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,reference)
);
create index sales_company_date_idx on public.sales(company_id,issue_date desc);

create table public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check(quantity > 0),
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 18,
  line_total numeric(14,2) not null default 0
);
create index sale_lines_sale_idx on public.sale_lines(sale_id);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  reference text not null,
  status public.purchase_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,reference)
);

create table public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check(quantity > 0),
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 18,
  line_total numeric(14,2) not null default 0
);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type public.account_type not null,
  opening_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id,name)
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  type public.transaction_type not null,
  amount numeric(14,2) not null check(amount >= 0),
  label text not null,
  transaction_date date not null default current_date,
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index financial_transactions_company_date_idx on public.financial_transactions(company_id,transaction_date desc);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  type public.stock_movement_type not null,
  quantity numeric(14,3) not null check(quantity > 0),
  unit_cost numeric(14,2) not null default 0,
  movement_date date not null default current_date,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_item_date_idx on public.stock_movements(item_id,movement_date desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  name text not null,
  document_type text,
  google_drive_file_id text not null,
  google_drive_url text not null,
  mime_type text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index documents_company_idx on public.documents(company_id);

create table public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  google_account_email text,
  refresh_token_encrypted text,
  access_token_encrypted text,
  expires_at timestamptz,
  root_folder_id text,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_company_date_idx on public.audit_logs(company_id,created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin foreach t in array array['companies','profiles','contacts','items','projects','sales','purchases','google_drive_connections'] loop execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t); end loop; end $$;

create or replace function public.my_company_id() returns uuid language sql stable security definer set search_path=public as $$ select company_id from public.profiles where id = auth.uid() limit 1 $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.projects enable row level security;
alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_lines enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.stock_movements enable row level security;
alter table public.documents enable row level security;
alter table public.google_drive_connections enable row level security;
alter table public.audit_logs enable row level security;

create policy "company members can read company" on public.companies for select using (id = public.my_company_id());
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "members read contacts" on public.contacts for select using (company_id = public.my_company_id());
create policy "members write contacts" on public.contacts for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all categories" on public.categories for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all items" on public.items for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all projects" on public.projects for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all sales" on public.sales for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all sale lines" on public.sale_lines for all using (exists(select 1 from public.sales s where s.id=sale_id and s.company_id=public.my_company_id())) with check (exists(select 1 from public.sales s where s.id=sale_id and s.company_id=public.my_company_id()));
create policy "members all purchases" on public.purchases for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all purchase lines" on public.purchase_lines for all using (exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.my_company_id())) with check (exists(select 1 from public.purchases p where p.id=purchase_id and p.company_id=public.my_company_id()));
create policy "members all accounts" on public.financial_accounts for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all transactions" on public.financial_transactions for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all stock movements" on public.stock_movements for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all documents" on public.documents for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members all drive connections" on public.google_drive_connections for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy "members read audit" on public.audit_logs for select using (company_id = public.my_company_id());

create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email)); return new; end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();
