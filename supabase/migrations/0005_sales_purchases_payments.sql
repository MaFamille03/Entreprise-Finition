-- Finition ERP — ventes, achats, paiements et validation métier

create or replace function public.sync_sale_payment_status(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_total numeric(14,2); v_paid numeric(14,2); v_status public.document_status;
begin
  select total, greatest(0, amount_paid) into v_total, v_paid from public.sales where id=p_sale_id;
  if not found then return; end if;
  if v_paid <= 0 then v_status := 'validated';
  elsif v_paid < v_total then v_status := 'partially_paid';
  else v_status := 'paid';
  end if;
  update public.sales set status=v_status, updated_at=now() where id=p_sale_id and status <> 'cancelled';
end $$;

create or replace function public.sync_purchase_payment_status(p_purchase_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_total numeric(14,2); v_paid numeric(14,2); v_status public.purchase_status;
begin
  select total, greatest(0, amount_paid) into v_total, v_paid from public.purchases where id=p_purchase_id;
  if not found then return; end if;
  if v_paid <= 0 then v_status := 'ordered';
  elsif v_paid < v_total then v_status := 'ordered';
  else v_status := 'received';
  end if;
  update public.purchases set status=v_status, updated_at=now() where id=p_purchase_id and status <> 'cancelled';
end $$;

create or replace function public.record_customer_payment(
  p_company_id uuid,
  p_sale_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_reference text default null,
  p_label text default null
) returns uuid language plpgsql security invoker as $$
declare
  v_id uuid; v_total numeric(14,2); v_paid numeric(14,2); v_remaining numeric(14,2); v_client uuid;
begin
  if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
  if p_amount <= 0 then raise exception 'Le montant du paiement doit être supérieur à zéro'; end if;
  select total, amount_paid, client_id into v_total, v_paid, v_client from public.sales
    where id=p_sale_id and company_id=p_company_id for update;
  if not found then raise exception 'Vente introuvable'; end if;
  v_remaining := greatest(v_total - v_paid, 0);
  if p_amount > v_remaining then raise exception 'Le paiement dépasse le reste à payer'; end if;
  insert into public.financial_transactions(company_id,account_id,contact_id,sale_id,type,amount,label,reference,created_by)
    values(p_company_id,p_account_id,v_client,p_sale_id,'customer_payment',p_amount,coalesce(p_label,'Paiement client'),p_reference,auth.uid())
    returning id into v_id;
  update public.sales set amount_paid=amount_paid+p_amount, updated_at=now() where id=p_sale_id;
  perform public.sync_sale_payment_status(p_sale_id);
  return v_id;
end $$;

create or replace function public.record_supplier_payment(
  p_company_id uuid,
  p_purchase_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_reference text default null,
  p_label text default null
) returns uuid language plpgsql security invoker as $$
declare
  v_id uuid; v_total numeric(14,2); v_paid numeric(14,2); v_remaining numeric(14,2); v_supplier uuid;
begin
  if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
  if p_amount <= 0 then raise exception 'Le montant du paiement doit être supérieur à zéro'; end if;
  select total, amount_paid, supplier_id into v_total, v_paid, v_supplier from public.purchases
    where id=p_purchase_id and company_id=p_company_id for update;
  if not found then raise exception 'Achat introuvable'; end if;
  v_remaining := greatest(v_total - v_paid, 0);
  if p_amount > v_remaining then raise exception 'Le paiement dépasse la dette fournisseur'; end if;
  insert into public.financial_transactions(company_id,account_id,contact_id,purchase_id,type,amount,label,reference,created_by)
    values(p_company_id,p_account_id,v_supplier,p_purchase_id,'supplier_payment',p_amount,coalesce(p_label,'Paiement fournisseur'),p_reference,auth.uid())
    returning id into v_id;
  update public.purchases set amount_paid=amount_paid+p_amount, updated_at=now() where id=p_purchase_id;
  perform public.sync_purchase_payment_status(p_purchase_id);
  return v_id;
end $$;

create or replace function public.validate_sale(p_sale_id uuid)
returns void language plpgsql security invoker as $$
declare r record; v_company uuid;
begin
  select company_id into v_company from public.sales where id=p_sale_id for update;
  if not found or v_company <> public.my_company_id() then raise exception 'Vente non autorisée'; end if;
  if exists(select 1 from public.sales where id=p_sale_id and status='cancelled') then raise exception 'Une vente annulée ne peut pas être validée'; end if;
  if not exists(select 1 from public.sale_lines where sale_id=p_sale_id) then raise exception 'La vente doit contenir au moins une ligne'; end if;
  perform public.recalculate_sale_total(p_sale_id);
  for r in select sl.item_id, sl.quantity, coalesce(i.purchase_price,0) purchase_price from public.sale_lines sl join public.items i on i.id=sl.item_id where sl.sale_id=p_sale_id and i.is_stockable loop
    if (select stock_quantity from public.items where id=r.item_id) < r.quantity then
      raise exception 'Stock insuffisant pour l''article %', r.item_id;
    end if;
    if not exists(select 1 from public.stock_movements where sale_id=p_sale_id and item_id=r.item_id and type='sale') then
      insert into public.stock_movements(company_id,item_id,sale_id,type,quantity,unit_cost,note,created_by)
        values(v_company,r.item_id,p_sale_id,'sale',r.quantity,r.purchase_price,'Sortie liée à la vente',auth.uid());
    end if;
  end loop;
  update public.sales set status=case when amount_paid >= total and total > 0 then 'paid' else 'validated' end, updated_at=now() where id=p_sale_id;
end $$;

create or replace function public.receive_purchase(p_purchase_id uuid)
returns void language plpgsql security invoker as $$
declare r record; v_company uuid;
begin
  select company_id into v_company from public.purchases where id=p_purchase_id for update;
  if not found or v_company <> public.my_company_id() then raise exception 'Achat non autorisé'; end if;
  if exists(select 1 from public.purchases where id=p_purchase_id and status='cancelled') then raise exception 'Un achat annulé ne peut pas être réceptionné'; end if;
  if not exists(select 1 from public.purchase_lines where purchase_id=p_purchase_id) then raise exception 'L''achat doit contenir au moins une ligne'; end if;
  perform public.recalculate_purchase_total(p_purchase_id);
  for r in select pl.item_id, pl.quantity, pl.unit_price from public.purchase_lines pl join public.items i on i.id=pl.item_id where pl.purchase_id=p_purchase_id and i.is_stockable loop
    if not exists(select 1 from public.stock_movements where purchase_id=p_purchase_id and item_id=r.item_id and type='purchase') then
      insert into public.stock_movements(company_id,item_id,purchase_id,type,quantity,unit_cost,note,created_by)
        values(v_company,r.item_id,p_purchase_id,'purchase',r.quantity,r.unit_price,'Entrée liée à la réception fournisseur',auth.uid());
    end if;
  end loop;
  update public.purchases set status='received', updated_at=now() where id=p_purchase_id;
end $$;

-- Empêche une double réception/validation par référence d'opération.
create unique index if not exists stock_sale_once_idx on public.stock_movements(sale_id,item_id,type) where sale_id is not null and type='sale';
create unique index if not exists stock_purchase_once_idx on public.stock_movements(purchase_id,item_id,type) where purchase_id is not null and type='purchase';

revoke execute on function public.validate_sale(uuid) from public;
revoke execute on function public.receive_purchase(uuid) from public;
revoke execute on function public.record_customer_payment(uuid,uuid,uuid,numeric,text,text) from public;
revoke execute on function public.record_supplier_payment(uuid,uuid,uuid,numeric,text,text) from public;
grant execute on function public.validate_sale(uuid) to authenticated;
grant execute on function public.receive_purchase(uuid) to authenticated;
grant execute on function public.record_customer_payment(uuid,uuid,uuid,numeric,text,text) to authenticated;
grant execute on function public.record_supplier_payment(uuid,uuid,uuid,numeric,text,text) to authenticated;

create or replace function public.create_sale_document(
  p_company_id uuid,
  p_document_type text,
  p_client_id uuid,
  p_project_id uuid,
  p_issue_date date,
  p_due_date date,
  p_discount numeric,
  p_notes text,
  p_lines jsonb
) returns uuid language plpgsql security invoker as $$
declare v_sale uuid; v_ref text; v_seq bigint; l jsonb;
begin
  if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
  if p_document_type not in ('quote','order','delivery_note','invoice','credit_note') then raise exception 'Type de document invalide'; end if;
  if jsonb_array_length(coalesce(p_lines,'[]'::jsonb)) = 0 then raise exception 'Ajoutez au moins une ligne'; end if;
  v_ref := public.next_document_reference(p_company_id, (case p_document_type when 'quote' then 'DEV' when 'order' then 'CMD' when 'delivery_note' then 'BL' when 'invoice' then 'FAC' else 'AV' end)::public.numbering_document_type);
  insert into public.sales(company_id,client_id,project_id,reference,document_type,status,issue_date,due_date,discount,notes,created_by)
    values(p_company_id,p_client_id,p_project_id,v_ref,p_document_type,'draft',coalesce(p_issue_date,current_date),p_due_date,coalesce(p_discount,0),p_notes,auth.uid()) returning id into v_sale;
  for l in select * from jsonb_array_elements(p_lines) loop
    insert into public.sale_lines(sale_id,item_id,description,quantity,unit_price,discount,vat_rate)
      values(v_sale,nullif(l->>'item_id','')::uuid,l->>'description',(l->>'quantity')::numeric,(l->>'unit_price')::numeric,coalesce((l->>'discount')::numeric,0),coalesce((l->>'vat_rate')::numeric,18));
  end loop;
  perform public.recalculate_sale_total(v_sale);
  return v_sale;
end $$;

create or replace function public.create_purchase_document(
  p_company_id uuid,
  p_supplier_id uuid,
  p_project_id uuid,
  p_issue_date date,
  p_due_date date,
  p_discount numeric,
  p_notes text,
  p_lines jsonb
) returns uuid language plpgsql security invoker as $$
declare v_purchase uuid; v_ref text; l jsonb;
begin
  if p_company_id <> public.my_company_id() then raise exception 'Entreprise non autorisée'; end if;
  if jsonb_array_length(coalesce(p_lines,'[]'::jsonb)) = 0 then raise exception 'Ajoutez au moins une ligne'; end if;
  v_ref := public.next_document_reference(p_company_id, 'ACH'::public.numbering_document_type);
  insert into public.purchases(company_id,supplier_id,project_id,reference,status,issue_date,due_date,discount,notes,created_by)
    values(p_company_id,p_supplier_id,p_project_id,v_ref,'draft',coalesce(p_issue_date,current_date),p_due_date,coalesce(p_discount,0),p_notes,auth.uid()) returning id into v_purchase;
  for l in select * from jsonb_array_elements(p_lines) loop
    insert into public.purchase_lines(purchase_id,item_id,description,quantity,unit_price,discount,vat_rate)
      values(v_purchase,nullif(l->>'item_id','')::uuid,l->>'description',(l->>'quantity')::numeric,(l->>'unit_price')::numeric,coalesce((l->>'discount')::numeric,0),coalesce((l->>'vat_rate')::numeric,18));
  end loop;
  perform public.recalculate_purchase_total(v_purchase);
  return v_purchase;
end $$;

grant execute on function public.create_sale_document(uuid,text,uuid,uuid,date,date,numeric,text,jsonb) to authenticated;
grant execute on function public.create_purchase_document(uuid,uuid,uuid,date,date,numeric,text,jsonb) to authenticated;
