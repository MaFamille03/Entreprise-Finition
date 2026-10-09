import { createClient } from '@/lib/supabase-server';

export async function getCurrentUserContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { supabase, user, profile };
}

export async function getDashboardData() {
  const { supabase, profile } = await getCurrentUserContext();
  if (!profile?.company_id) return null;
  const companyId = profile.company_id;
  const [sales, purchases, items, contacts, projects, accounts, transactions, invoiceSummaryRows] = await Promise.all([
    supabase.from('sales').select('id,reference,total,amount_paid,status,document_type,issue_date').eq('company_id', companyId).order('issue_date', { ascending: false }).limit(100),
    supabase.from('purchases').select('id,total,amount_paid,status,issue_date').eq('company_id', companyId).order('issue_date', { ascending: false }).limit(100),
    supabase.from('items').select('id,name,stock_quantity,min_stock_quantity,purchase_price,sale_price,unit,sku').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('contacts').select('id,name,type,phone,email').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('projects').select('id,name,reference,status,budget,client_id').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
    supabase.from('financial_accounts').select('id,name,type,current_balance').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('financial_transactions').select('id,amount,type,transaction_date,label,account_id').eq('company_id', companyId).order('transaction_date', { ascending: false }).limit(100),
    supabase.from('sales').select('total,amount_paid,status').eq('company_id', companyId).eq('document_type', 'invoice').in('status', ['validated', 'partially_paid', 'paid']),
  ]);
  const validInvoices = invoiceSummaryRows.data ?? [];
  const salesSummary = validInvoices.reduce((summary, invoice) => {
    const total = Number(invoice.total ?? 0);
    const paid = Number(invoice.amount_paid ?? 0);
    summary.invoice_count += 1;
    summary.invoiced_total += total;
    summary.collected_total += paid;
    summary.receivable_total += Math.max(total - paid, 0);
    return summary;
  }, { invoice_count: 0, invoiced_total: 0, collected_total: 0, receivable_total: 0 });
  return { sales: sales.data ?? [], purchases: purchases.data ?? [], items: items.data ?? [], contacts: contacts.data ?? [], projects: projects.data ?? [], accounts: accounts.data ?? [], transactions: transactions.data ?? [], salesSummary };
}


/** Données complètes du journal de trésorerie : aucune limite d'historique. */
export async function getTreasuryData() {
  const { supabase, profile } = await getCurrentUserContext();
  if (!profile?.company_id) return null;
  const companyId = profile.company_id;
  const [accounts, transactions] = await Promise.all([
    supabase.from('financial_accounts').select('id,name,type,opening_balance,opening_balance_date,current_balance').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('financial_transactions').select('id,amount,type,transaction_date,label,account_id,reference,observation,created_at').eq('company_id', companyId).order('transaction_date', { ascending: true }).order('created_at', { ascending: true }),
  ]);
  if (accounts.error) throw new Error(`Impossible de charger les comptes : ${accounts.error.message}`);
  if (transactions.error) throw new Error(`Impossible de charger le journal : ${transactions.error.message}`);
  return { accounts: accounts.data ?? [], transactions: transactions.data ?? [] };
}
