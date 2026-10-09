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
  const [sales, purchases, items, contacts, projects, accounts, transactions] = await Promise.all([
    supabase.from('sales').select('id,reference,total,amount_paid,status,document_type,issue_date,due_date').eq('company_id', companyId).order('issue_date', { ascending: false }).limit(100),
    supabase.from('purchases').select('id,reference,total,amount_paid,status,issue_date').eq('company_id', companyId).order('issue_date', { ascending: false }).limit(100),
    supabase.from('items').select('id,name,stock_quantity,min_stock_quantity,purchase_price,sale_price,unit,sku').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('contacts').select('id,name,type,phone,email').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('projects').select('id,name,reference,status,budget,client_id').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
    supabase.from('financial_accounts').select('id,name,type,current_balance').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('financial_transactions').select('id,amount,type,transaction_date,label,account_id').eq('company_id', companyId).order('transaction_date', { ascending: false }).limit(100),
  ]);
  return { sales: sales.data ?? [], purchases: purchases.data ?? [], items: items.data ?? [], contacts: contacts.data ?? [], projects: projects.data ?? [], accounts: accounts.data ?? [], transactions: transactions.data ?? [] };
}
