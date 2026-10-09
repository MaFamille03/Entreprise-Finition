import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, companyId: null as string | null };
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  return { supabase, companyId: profile?.company_id ?? null };
}

export async function POST(request: Request) {
  const { supabase, companyId } = await context();
  if (!companyId) return NextResponse.json({ error: 'Non authentifié ou entreprise non configurée' }, { status: 401 });
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'La désignation est obligatoire' }, { status: 400 });
  const qty = Number(body.stock_quantity || 0);
  const min = Number(body.min_stock_quantity || 0);
  if (qty < 0 || min < 0) return NextResponse.json({ error: 'Les quantités ne peuvent pas être négatives' }, { status: 400 });
  const { data, error } = await supabase.from('items').insert({ company_id: companyId, name, sku: body.sku?.trim() || null, item_type: body.item_type || 'material', unit: body.unit || 'pcs', purchase_price: Number(body.purchase_price || 0), sale_price: Number(body.sale_price || 0), vat_rate: Number(body.vat_rate ?? 18), stock_quantity: qty, min_stock_quantity: min, is_stockable: body.is_stockable !== false }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, companyId } = await context();
  if (!companyId) return NextResponse.json({ error: 'Non authentifié ou entreprise non configurée' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'Article manquant' }, { status: 400 });
  const patch = { name: String(body.name ?? '').trim(), sku: body.sku?.trim() || null, item_type: body.item_type || 'material', unit: body.unit || 'pcs', purchase_price: Number(body.purchase_price || 0), sale_price: Number(body.sale_price || 0), vat_rate: Number(body.vat_rate ?? 18), min_stock_quantity: Number(body.min_stock_quantity || 0), is_stockable: body.is_stockable !== false };
  if (!patch.name || patch.purchase_price < 0 || patch.sale_price < 0 || patch.min_stock_quantity < 0) return NextResponse.json({ error: 'Données matériau invalides' }, { status: 400 });
  const { data, error } = await supabase.from('items').update(patch).eq('id', body.id).eq('company_id', companyId).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
