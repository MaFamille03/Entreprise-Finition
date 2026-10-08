-- Automatisation des totaux, stocks et soldes financiers.

create or replace function public.recalculate_sale_total(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_subtotal numeric(14,2); v_discount numeric(14,2); v_vat numeric(14,2); v_total numeric(14,2);
begin
 select coalesce(sum(quantity*unit_price),0), coalesce(sum(discount),0), coalesce(sum((quantity*unit_price-discount)*vat_rate/100),0)
 into v_subtotal,v_discount,v_vat from public.sale_lines where sale_id=p_sale_id;
 v_total := v_subtotal-v_discount+v_vat;
 update public.sales set subtotal=v_subtotal,discount=v_discount,vat=v_vat,total=v_total where id=p_sale_id;
end $$;

create or replace function public.sale_lines_totals_trigger() returns trigger language plpgsql as $$
begin
 new.line_total := round((new.quantity*new.unit_price-new.discount)*(1+new.vat_rate/100),2);
 return new;
end $$;
create trigger sale_lines_totals before insert or update on public.sale_lines for each row execute function public.sale_lines_totals_trigger();

create or replace function public.sale_recalc_trigger() returns trigger language plpgsql as $$
begin
 perform public.recalculate_sale_total(coalesce(new.sale_id,old.sale_id));
 if tg_op='UPDATE' and new.sale_id<>old.sale_id then perform public.recalculate_sale_total(old.sale_id); end if;
 return coalesce(new,old);
end $$;
create trigger sale_lines_recalc after insert or update or delete on public.sale_lines for each row execute function public.sale_recalc_trigger();

create or replace function public.recalculate_purchase_total(p_purchase_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_subtotal numeric(14,2); v_discount numeric(14,2); v_vat numeric(14,2); v_total numeric(14,2);
begin
 select coalesce(sum(quantity*unit_price),0), coalesce(sum(discount),0), coalesce(sum((quantity*unit_price-discount)*vat_rate/100),0)
 into v_subtotal,v_discount,v_vat from public.purchase_lines where purchase_id=p_purchase_id;
 v_total := v_subtotal-v_discount+v_vat;
 update public.purchases set subtotal=v_subtotal,discount=v_discount,vat=v_vat,total=v_total where id=p_purchase_id;
end $$;

create or replace function public.purchase_lines_totals_trigger() returns trigger language plpgsql as $$
begin
 new.line_total := round((new.quantity*new.unit_price-new.discount)*(1+new.vat_rate/100),2);
 return new;
end $$;
create trigger purchase_lines_totals before insert or update on public.purchase_lines for each row execute function public.purchase_lines_totals_trigger();

create or replace function public.purchase_recalc_trigger() returns trigger language plpgsql as $$
begin
 perform public.recalculate_purchase_total(coalesce(new.purchase_id,old.purchase_id));
 if tg_op='UPDATE' and new.purchase_id<>old.purchase_id then perform public.recalculate_purchase_total(old.purchase_id); end if;
 return coalesce(new,old);
end $$;
create trigger purchase_lines_recalc after insert or update or delete on public.purchase_lines for each row execute function public.purchase_recalc_trigger();

create or replace function public.apply_stock_movement() returns trigger language plpgsql security definer set search_path=public as $$
declare delta numeric(14,3);
begin
 delta := case when new.type in ('purchase','adjustment_in','return_in','transfer_in') then new.quantity else -new.quantity end;
 update public.items set stock_quantity=stock_quantity+delta,updated_at=now() where id=new.item_id;
 return new;
end $$;
create trigger stock_movement_apply after insert on public.stock_movements for each row execute function public.apply_stock_movement();

create or replace function public.apply_financial_transaction() returns trigger language plpgsql security definer set search_path=public as $$
declare delta numeric(14,2);
begin
 delta := case when new.type in ('income','transfer_in','customer_payment') then new.amount else -new.amount end;
 update public.financial_accounts set current_balance=current_balance+delta where id=new.account_id;
 return new;
end $$;
create trigger financial_transaction_apply after insert on public.financial_transactions for each row execute function public.apply_financial_transaction();

create or replace function public.create_stock_movement(
 p_company_id uuid,p_item_id uuid,p_type public.stock_movement_type,p_quantity numeric,p_unit_cost numeric default 0,
 p_project_id uuid default null,p_sale_id uuid default null,p_purchase_id uuid default null,p_note text default null
) returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
 if p_quantity <= 0 then raise exception 'La quantité doit être supérieure à zéro'; end if;
 if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
 insert into public.stock_movements(company_id,item_id,type,quantity,unit_cost,project_id,sale_id,purchase_id,note,created_by)
 values(p_company_id,p_item_id,p_type,p_quantity,p_unit_cost,p_project_id,p_sale_id,p_purchase_id,p_note,auth.uid()) returning id into v_id;
 return v_id;
end $$;

create or replace function public.create_financial_transaction(
 p_company_id uuid,p_account_id uuid,p_type public.transaction_type,p_amount numeric,p_label text,
 p_contact_id uuid default null,p_project_id uuid default null,p_sale_id uuid default null,p_purchase_id uuid default null,p_reference text default null
) returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
 if p_amount < 0 then raise exception 'Le montant ne peut pas être négatif'; end if;
 if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
 insert into public.financial_transactions(company_id,account_id,type,amount,label,contact_id,project_id,sale_id,purchase_id,reference,created_by)
 values(p_company_id,p_account_id,p_type,p_amount,p_label,p_contact_id,p_project_id,p_sale_id,p_purchase_id,p_reference,auth.uid()) returning id into v_id;
 return v_id;
end $$;

-- Les mouvements financiers et de stock sont des écritures historiques : pas de suppression par défaut.
revoke delete on public.stock_movements from authenticated;
revoke delete on public.financial_transactions from authenticated;
