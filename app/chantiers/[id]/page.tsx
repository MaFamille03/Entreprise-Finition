import Link from 'next/link';
import { ArrowLeft, Building2, FileText, Package, Receipt, Wallet, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Page } from '@/components/ui/page';
import { createClient } from '@/lib/supabase-server';
import { formatMoney, labelStatus } from '@/lib/format';

function statusClass(status: string) {
  if (status === 'completed') return 'badge badge-green';
  if (status === 'cancelled' || status === 'suspended') return 'badge badge-red';
  if (status === 'in_progress') return 'badge badge-blue';
  return 'badge badge-orange';
}

export default async function ChantierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('id,reference,name,address,description,status,start_date,expected_end_date,actual_end_date,budget,created_at,contacts(name,phone,email)').eq('id', id).single();
  if (!project) notFound();
  const [{ data: summary }, { data: quotes }, { data: invoices }, { data: purchases }, { data: expenses }, { data: stock }] = await Promise.all([
    supabase.from('project_financial_summary').select('*').eq('project_id', id).maybeSingle(),
    supabase.from('sales').select('id,reference,document_type,status,issue_date,total,amount_paid').eq('project_id', id).in('document_type', ['quote','order']).order('issue_date', { ascending: false }),
    supabase.from('sales').select('id,reference,status,issue_date,total,amount_paid').eq('project_id', id).eq('document_type', 'invoice').order('issue_date', { ascending: false }),
    supabase.from('purchases').select('id,reference,status,issue_date,total,amount_paid').eq('project_id', id).order('issue_date', { ascending: false }),
    supabase.from('expenses').select('id,reference,label,category,amount,expense_date').eq('project_id', id).order('expense_date', { ascending: false }),
    supabase.from('stock_movements').select('id,type,quantity,unit_cost,movement_date,note,items(name,unit)').eq('project_id', id).order('movement_date', { ascending: false }),
  ]);
  const client = Array.isArray((project as any).contacts) ? (project as any).contacts[0] : (project as any).contacts;
  const s: any = summary ?? {};
  const invoicesTotal = (invoices ?? []).reduce((n: number, x: any) => n + Number(x.total || 0), 0);
  const paidTotal = (invoices ?? []).reduce((n: number, x: any) => n + Number(x.amount_paid || 0), 0);
  const purchaseTotal = (purchases ?? []).reduce((n: number, x: any) => n + Number(x.total || 0), 0);
  const expenseTotal = (expenses ?? []).reduce((n: number, x: any) => n + Number(x.amount || 0), 0);

  return <Page title={project.name} description={`${project.reference} • ${client?.name || 'Client non renseigné'}`} action={<Link className="btn btn-outline" href="/chantiers"><ArrowLeft size={16} /> Retour aux chantiers</Link>}>
    <div className="project-hero card">
      <div className="project-hero-main"><div className="project-icon project-icon-large"><Building2 size={24} /></div><div><div className="project-reference">{project.reference}</div><h2>{project.name}</h2><div className="muted">{project.address || 'Adresse non renseignée'}</div></div></div>
      <div className="project-hero-side"><span className={statusClass(project.status)}>{labelStatus(project.status)}</span><div className="project-dates">{project.start_date ? `Début ${new Date(project.start_date).toLocaleDateString('fr-FR')}` : 'Début non défini'} · {project.expected_end_date ? `Fin ${new Date(project.expected_end_date).toLocaleDateString('fr-FR')}` : 'Fin non définie'}</div></div>
    </div>

    <div className="grid-cards project-kpis">
      <div className="card"><div className="stat-label">Montant du marché</div><div className="stat-value">{formatMoney(project.budget)}</div></div>
      <div className="card"><div className="stat-label">Facturé</div><div className="stat-value">{formatMoney(invoicesTotal || s.revenue)}</div></div>
      <div className="card"><div className="stat-label">Coût du chantier</div><div className="stat-value">{formatMoney(s.cost)}</div></div>
      <div className="card"><div className="stat-label">Marge</div><div className="stat-value">{formatMoney(s.margin)}</div></div>
      <div className="card"><div className="stat-label">Encaissé</div><div className="stat-value">{formatMoney(paidTotal)}</div></div>
      <div className="card"><div className="stat-label">Reste à encaisser</div><div className="stat-value">{formatMoney(Math.max(invoicesTotal - paidTotal, 0))}</div></div>
      <div className="card"><div className="stat-label">Achats liés</div><div className="stat-value">{formatMoney(purchaseTotal)}</div></div>
      <div className="card"><div className="stat-label">Dépenses directes</div><div className="stat-value">{formatMoney(expenseTotal)}</div></div>
    </div>

    <div className="project-detail-grid">
      <section className="card"><div className="section-title"><div><h3>Documents commerciaux</h3><span className="muted">Devis, commandes et factures liés au chantier.</span></div><Link className="btn btn-secondary" href={`/ventes?project=${project.id}`}><FileText size={15} /> Ouvrir commercial</Link></div>
        <div className="mini-table">{[...(quotes ?? []), ...(invoices ?? [])].slice(0, 8).map((doc: any) => <div className="mini-row" key={doc.id}><div><strong>{doc.reference}</strong><div className="muted">{doc.document_type === 'quote' ? 'Devis / proforma' : doc.document_type === 'order' ? 'Commande' : 'Facture'} · {new Date(doc.issue_date).toLocaleDateString('fr-FR')}</div></div><strong>{formatMoney(doc.total)}</strong></div>)}{!(quotes?.length || invoices?.length) && <div className="empty-state">Aucun document commercial.</div>}</div>
      </section>

      <section className="card"><div className="section-title"><div><h3>Client</h3><span className="muted">Coordonnées du dossier.</span></div><Link className="icon-link" href="/contacts"><ArrowUpRight size={16} /></Link></div><div className="contact-box"><strong>{client?.name || 'Client non renseigné'}</strong><span>{client?.phone || 'Téléphone non renseigné'}</span><span>{client?.email || 'Email non renseigné'}</span></div><p className="project-description">{project.description || 'Aucune description renseignée pour ce chantier.'}</p></section>

      <section className="card"><div className="section-title"><div><h3>Achats</h3><span className="muted">Approvisionnements affectés au chantier.</span></div><ShoppingCart size={18} /></div><div className="mini-table">{(purchases ?? []).slice(0, 6).map((purchase: any) => <div className="mini-row" key={purchase.id}><div><strong>{purchase.reference}</strong><div className="muted">{purchase.status} · {new Date(purchase.issue_date).toLocaleDateString('fr-FR')}</div></div><strong>{formatMoney(purchase.total)}</strong></div>)}{!purchases?.length && <div className="empty-state">Aucun achat lié.</div>}</div></section>

      <section className="card"><div className="section-title"><div><h3>Dépenses</h3><span className="muted">Dépenses directement imputées au chantier.</span></div><Wallet size={18} /></div><div className="mini-table">{(expenses ?? []).slice(0, 6).map((expense: any) => <div className="mini-row" key={expense.id}><div><strong>{expense.label}</strong><div className="muted">{expense.category} · {new Date(expense.expense_date).toLocaleDateString('fr-FR')}</div></div><strong>{formatMoney(expense.amount)}</strong></div>)}{!expenses?.length && <div className="empty-state">Aucune dépense liée.</div>}</div></section>

      <section className="card"><div className="section-title"><div><h3>Consommation de stock</h3><span className="muted">Mouvements de matériaux affectés au chantier.</span></div><Package size={18} /></div><div className="mini-table">{(stock ?? []).slice(0, 8).map((movement: any) => { const item = Array.isArray(movement.items) ? movement.items[0] : movement.items; return <div className="mini-row" key={movement.id}><div><strong>{item?.name || 'Article'}</strong><div className="muted">{movement.type} · {new Date(movement.movement_date).toLocaleDateString('fr-FR')}</div></div><strong>{movement.quantity} {item?.unit || ''}</strong></div>; })}{!stock?.length && <div className="empty-state">Aucun mouvement de stock.</div>}</div></section>

      <section className="card"><div className="section-title"><div><h3>Facturation & encaissements</h3><span className="muted">Situation financière du chantier.</span></div><Receipt size={18} /></div><div className="finance-lines"><div><span>Montant facturé</span><strong>{formatMoney(invoicesTotal)}</strong></div><div><span>Montant encaissé</span><strong>{formatMoney(paidTotal)}</strong></div><div><span>Reste à encaisser</span><strong>{formatMoney(Math.max(invoicesTotal - paidTotal, 0))}</strong></div><div><span>Coût enregistré</span><strong>{formatMoney(s.cost)}</strong></div><div><span>Marge actuelle</span><strong>{formatMoney(s.margin)}</strong></div></div></section>
    </div>
  </Page>;
}
