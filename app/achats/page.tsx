import { Page } from '@/components/ui/page';
import { getCurrentUserContext } from '@/lib/queries';
import { formatMoney, formatDate, labelStatus } from '@/lib/format';
import { PurchaseCreateForm } from './purchase-create-form';

export default async function Achats() {
  const { supabase, profile } = await getCurrentUserContext();
  if (!profile?.company_id) return <Page title="Achats & charges" description="Configurez d’abord votre entreprise." />;
  const companyId = profile.company_id;
  const [{ data: purchases }, { data: suppliers }, { data: projects }, { data: materials }] = await Promise.all([
    supabase.from('purchases').select('id,reference,total,amount_paid,status,issue_date').eq('company_id', companyId).order('issue_date', { ascending: false }).limit(100),
    supabase.from('contacts').select('id,name,type').eq('company_id', companyId).eq('type', 'supplier').eq('is_active', true).order('name'),
    supabase.from('projects').select('id,name,reference').eq('company_id', companyId).order('name'),
    supabase.from('items').select('id,name,purchase_price,unit').eq('company_id', companyId).eq('is_active', true).eq('is_stockable', true).eq('item_type', 'material').order('name'),
  ]);
  const rows = (purchases ?? []).filter((purchase: any) => purchase.status !== 'cancelled');
  const total = rows.reduce((sum: number, purchase: any) => sum + Number(purchase.total || 0), 0);
  const due = rows.reduce((sum: number, purchase: any) => sum + Math.max(Number(purchase.total || 0) - Number(purchase.amount_paid || 0), 0), 0);
  const paid = rows.reduce((sum: number, purchase: any) => sum + Number(purchase.amount_paid || 0), 0);

  return <Page title="Achats & charges" description="Suivez les matériaux, locations, sous-traitances, transports et autres coûts de l’entreprise." action={<a className="btn btn-primary" href="#nouvel-achat">+ Enregistrer un coût</a>}>
    <div className="grid-cards">
      <div className="card"><div className="stat-label">Documents actifs</div><div className="stat-value">{rows.length}</div></div>
      <div className="card"><div className="stat-label">Total des coûts enregistrés</div><div className="stat-value">{formatMoney(total)}</div></div>
      <div className="card"><div className="stat-label">Reste à payer</div><div className="stat-value">{formatMoney(due)}</div></div>
      <div className="card"><div className="stat-label">Déjà payé</div><div className="stat-value">{formatMoney(paid)}</div></div>
    </div>
    <div style={{ height: 18 }} />
    <div id="nouvel-achat"><PurchaseCreateForm companyId={companyId} suppliers={suppliers ?? []} projects={projects ?? []} materials={materials ?? []} /></div>
    <div style={{ height: 18 }} />
    <div className="card table-wrap"><table className="data-table"><thead><tr><th>Référence</th><th>Date</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead><tbody>
      {rows.map((purchase: any) => <tr key={purchase.id}><td><strong>{purchase.reference}</strong></td><td>{formatDate(purchase.issue_date)}</td><td>{formatMoney(purchase.total)}</td><td>{formatMoney(purchase.amount_paid)}</td><td>{formatMoney(Math.max(Number(purchase.total || 0) - Number(purchase.amount_paid || 0), 0))}</td><td>{labelStatus(purchase.status)}</td></tr>)}
      {rows.length === 0 && <tr><td colSpan={6}>Aucun achat ou coût enregistré.</td></tr>}
    </tbody></table></div>
  </Page>;
}
