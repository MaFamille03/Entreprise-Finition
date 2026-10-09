import { Page } from '@/components/ui/page';
import { getCurrentUserContext } from '@/lib/queries';
import { formatMoney, formatDate, labelStatus } from '@/lib/format';
import { SaleCreateForm } from './sale-create-form';

const documentLabels: Record<string, string> = {
  quote: 'Devis',
  invoice: 'Facture',
  order: 'Commande / accord',
  delivery_note: 'Bon d’intervention',
  credit_note: 'Avoir',
};

export default async function PrestationsFacturation() {
  const { supabase, profile } = await getCurrentUserContext();
  if (!profile?.company_id) return <Page title="Prestations & facturation" description="Configurez d’abord votre entreprise." />;
  const companyId = profile.company_id;
  const [{ data: documents }, { data: contacts }, { data: projects }] = await Promise.all([
    supabase.from('sales').select('id,reference,total,amount_paid,status,document_type,issue_date').eq('company_id', companyId).order('issue_date', { ascending: false }).limit(100),
    supabase.from('contacts').select('id,name,type').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('projects').select('id,name,reference').eq('company_id', companyId).order('name'),
  ]);
  const rows = documents ?? [];
  const validInvoices = rows.filter((document: any) => document.document_type === 'invoice' && ['validated', 'partially_paid', 'paid'].includes(document.status));
  const invoiced = validInvoices.reduce((sum: number, document: any) => sum + Number(document.total || 0), 0);
  const outstanding = validInvoices.reduce((sum: number, document: any) => sum + Math.max(Number(document.total || 0) - Number(document.amount_paid || 0), 0), 0);
  const collected = validInvoices.reduce((sum: number, document: any) => sum + Number(document.amount_paid || 0), 0);

  return (
    <Page title="Prestations & facturation" description="Préparez vos devis, facturez les travaux réalisés et suivez les règlements clients." action={<a className="btn btn-primary" href="#nouveau-document">+ Nouveau document</a>}>
      <div className="grid-cards">
        <div className="card"><div className="stat-label">Documents enregistrés</div><div className="stat-value">{rows.length}</div></div>
        <div className="card"><div className="stat-label">Prestations facturées</div><div className="stat-value">{formatMoney(invoiced)}</div></div>
        <div className="card"><div className="stat-label">Reste à encaisser</div><div className="stat-value">{formatMoney(outstanding)}</div></div>
        <div className="card"><div className="stat-label">Déjà encaissé sur factures</div><div className="stat-value">{formatMoney(collected)}</div></div>
      </div>
      <div style={{ height: 18 }} />
      <div id="nouveau-document"><SaleCreateForm companyId={companyId} contacts={contacts ?? []} projects={projects ?? []} /></div>
      <div style={{ height: 18 }} />
      <div className="card table-wrap">
        <table className="data-table">
          <thead><tr><th>Référence</th><th>Document</th><th>Date</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead>
          <tbody>
            {rows.map((document: any) => <tr key={document.id}><td><strong>{document.reference}</strong></td><td>{documentLabels[document.document_type] ?? document.document_type}</td><td>{formatDate(document.issue_date)}</td><td>{formatMoney(document.total)}</td><td>{formatMoney(document.amount_paid)}</td><td>{formatMoney(Math.max(Number(document.total || 0) - Number(document.amount_paid || 0), 0))}</td><td>{labelStatus(document.status)}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={7}>Aucun devis ou document de prestation enregistré.</td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
