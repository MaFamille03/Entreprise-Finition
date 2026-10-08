-- Finition ERP — protections et automatisations métier supplémentaires

-- Vérifie que les contacts utilisés par ventes/achats/chantiers appartiennent à la même entreprise.
create or replace function public.validate_contact_company() returns trigger language plpgsql as $$
declare v_company uuid; v_contact_company uuid;
begin
  v_company := new.company_id;
  if new.client_id is not null then
    select company_id into v_contact_company from public.contacts where id=new.client_id;
    if v_contact_company is null or v_contact_company <> v_company then raise exception 'Client appartenant à une autre entreprise'; end if;
  end if;
  if new.supplier_id is not null then
    select company_id into v_contact_company from public.contacts where id=new.supplier_id;
    if v_contact_company is null or v_contact_company <> v_company then raise exception 'Fournisseur appartenant à une autre entreprise'; end if;
  end if;
  return new;
end $$;

drop trigger if exists validate_sale_contact_company on public.sales;
create trigger validate_sale_contact_company before insert or update on public.sales for each row execute function public.validate_contact_company();
drop trigger if exists validate_purchase_contact_company on public.purchases;
create trigger validate_purchase_contact_company before insert or update on public.purchases for each row execute function public.validate_contact_company();

-- Empêche un chantier de pointer vers un client d'une autre entreprise.
create or replace function public.validate_project_client_company() returns trigger language plpgsql as $$
declare v_company uuid;
begin
  if new.client_id is not null then
    select company_id into v_company from public.contacts where id=new.client_id;
    if v_company is null or v_company <> new.company_id then raise exception 'Client du chantier appartenant à une autre entreprise'; end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_project_client_company on public.projects;
create trigger validate_project_client_company before insert or update on public.projects for each row execute function public.validate_project_client_company();

-- Mise à jour automatique de updated_at pour les principales tables.
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists contacts_touch_updated_at on public.contacts;
create trigger contacts_touch_updated_at before update on public.contacts for each row execute function public.touch_updated_at();
drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at before update on public.items for each row execute function public.touch_updated_at();
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists sales_touch_updated_at on public.sales;
create trigger sales_touch_updated_at before update on public.sales for each row execute function public.touch_updated_at();
drop trigger if exists purchases_touch_updated_at on public.purchases;
create trigger purchases_touch_updated_at before update on public.purchases for each row execute function public.touch_updated_at();

-- Les écritures d'audit ne sont pas supprimables par les utilisateurs applicatifs.
revoke delete on public.audit_logs from authenticated;
