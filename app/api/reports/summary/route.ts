import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const billableStatuses = ['validated', 'partially_paid', 'paid'];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  if (!profile?.company_id) return NextResponse.json({ error: 'Entreprise non configurée' }, { status: 400 });

  const companyId = profile.company_id;
  const [salesRows, purchases, financial, stock, projectResult] = await Promise.all([
    supabase.from('sales').select('project_id,total,amount_paid,status,document_type').eq('company_id', companyId),
    supabase.from('company_purchase_summary').select('*').maybeSingle(),
    supabase.from('company_financial_summary').select('*').maybeSingle(),
    supabase.from('company_stock_summary').select('*').maybeSingle(),
    supabase.from('project_financial_summary').select('*').eq('company_id', companyId).order('margin', { ascending: false }),
  ]);

  const failed = [salesRows, purchases, financial, stock, projectResult].find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 400 });

  const validInvoices = (salesRows.data ?? []).filter((document) => document.document_type === 'invoice' && billableStatuses.includes(document.status));
  const invoicedTotal = validInvoices.reduce((sum, document) => sum + Number(document.total || 0), 0);
  const collectedTotal = validInvoices.reduce((sum, document) => sum + Number(document.amount_paid || 0), 0);
  const sales = {
    invoice_count: validInvoices.length,
    invoiced_total: invoicedTotal,
    collected_total: collectedTotal,
    receivable_total: validInvoices.reduce((sum, document) => sum + Math.max(Number(document.total || 0) - Number(document.amount_paid || 0), 0), 0),
  };

  const projectRevenue = new Map<string, number>();
  for (const invoice of validInvoices) {
    if (!invoice.project_id) continue;
    projectRevenue.set(invoice.project_id, (projectRevenue.get(invoice.project_id) ?? 0) + Number(invoice.total || 0));
  }
  const projects = (projectResult.data ?? []).map((project) => {
    const revenue = projectRevenue.get(project.project_id) ?? 0;
    const cost = Number(project.cost || 0);
    return { ...project, revenue, cost, margin: revenue - cost };
  }).sort((a, b) => b.margin - a.margin);

  return NextResponse.json({ sales, purchases: purchases.data, financial: financial.data, stock: stock.data, projects });
}
