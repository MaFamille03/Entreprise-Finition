import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  if (!profile?.company_id) return NextResponse.json({ error: 'Entreprise non configurée' }, { status: 400 });
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const type = String(body.type ?? 'client');
  if (!name) return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });
  const allowed = ['client','prospect','supplier','provider','subcontractor','other'];
  if (!allowed.includes(type)) return NextResponse.json({ error: 'Type de contact invalide' }, { status: 400 });
  const { data, error } = await supabase.from('contacts').insert({
    company_id: profile.company_id, name, type,
    phone: body.phone?.trim() || null, email: body.email?.trim() || null,
    address: body.address?.trim() || null, city: body.city?.trim() || null,
    tax_id: body.tax_id?.trim() || null, notes: body.notes?.trim() || null,
    credit_limit: Number(body.credit_limit || 0)
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  const body = await request.json();
  if (!profile?.company_id || !body.id) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  const patch = { name: String(body.name ?? '').trim(), type: body.type, phone: body.phone?.trim() || null, email: body.email?.trim() || null, address: body.address?.trim() || null, city: body.city?.trim() || null, tax_id: body.tax_id?.trim() || null, notes: body.notes?.trim() || null, credit_limit: Number(body.credit_limit || 0) };
  if (!patch.name) return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });
  const { data, error } = await supabase.from('contacts').update(patch).eq('id', body.id).eq('company_id', profile.company_id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
