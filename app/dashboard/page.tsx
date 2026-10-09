import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, FileText, HardHat, Plus, Wallet } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { getDashboardData } from '@/lib/queries';
import { formatDate, formatMoney, labelStatus } from '@/lib/format';

const documentLabels: Record<string, string> = {
  quote: 'Devis', invoice: 'Facture', order: 'Accord', delivery_note: 'Bon d’intervention', credit_note: 'Avoir',
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  if (!data) {
    return <Page title="Tableau de bord" description="Vue d’ensemble de votre entreprise.">
      <section className="card"><h2>Entreprise non configurée</h2><p className="muted">Configurez votre entreprise pour afficher les indicateurs et gérer vos chantiers.</p><Link className="btn btn-primary" href="/onboarding">Configurer mon entreprise</Link></section>
    </Page>;
  }

  const activeProjects = data.projects.filter((project: any) => !['completed', 'cancelled'].includes(project.status));
  const recentDocuments = [...data.sales].slice(0, 6);
  const recentProjects = [...data.projects].slice(0, 5);
  const totalCash = data.accounts.reduce((sum: number, account: any) => sum + Number(account.current_balance ?? 0), 0);
  const salesSummary = data.salesSummary ?? { invoice_count: 0, invoiced_total: 0, collected_total: 0, receivable_total: 0 };
  const outstandingCosts = data.purchases.reduce((sum: number, purchase: any) => {
    if (purchase.status === 'cancelled') return sum;
    return sum + Math.max(Number(purchase.total ?? 0) - Number(purchase.amount_paid ?? 0), 0);
  }, 0);

  return <Page title="Tableau de bord" description="La situation de l’entreprise : chantiers, prestations, coûts et trésorerie." action={<Link className="btn btn-primary" href="/chantiers/nouveau"><Plus size={16}/> Nouveau chantier</Link>}>
    <section className="grid-cards">
      <article className="card"><div className="dashboard-card-head"><span className="stat-label">Trésorerie disponible</span><Wallet size={18}/></div><div className="stat-value">{formatMoney(totalCash)}</div><p className="muted">Solde cumulé des comptes actifs</p><Link className="dashboard-link" href="/caisse">Voir la trésorerie <ArrowRight size={14}/></Link></article>
      <article className="card"><div className="dashboard-card-head"><span className="stat-label">Prestations facturées</span><FileText size={18}/></div><div className="stat-value">{formatMoney(Number(salesSummary.invoiced_total ?? 0))}</div><p className="muted">{Number(salesSummary.invoice_count ?? 0)} facture(s) non annulée(s)</p><Link className="dashboard-link" href="/ventes">Voir la facturation <ArrowRight size={14}/></Link></article>
      <article className="card"><div className="dashboard-card-head"><span className="stat-label">Créances clients</span><ArrowDownRight size={18}/></div><div className="stat-value">{formatMoney(Number(salesSummary.receivable_total ?? 0))}</div><p className="muted">Montants restant à encaisser</p><Link className="dashboard-link" href="/ventes">Suivre les règlements <ArrowRight size={14}/></Link></article>
      <article className="card"><div className="dashboard-card-head"><span className="stat-label">Chantiers actifs</span><HardHat size={18}/></div><div className="stat-value">{activeProjects.length}</div><p className="muted">Chantiers non terminés et non annulés</p><Link className="dashboard-link" href="/chantiers">Voir les chantiers <ArrowRight size={14}/></Link></article>
    </section>

    <div className="dashboard-shortcuts">
      <Link className="dashboard-shortcut" href="/ventes"><span className="shortcut-icon"><FileText size={18}/></span><span><strong>Créer un devis ou une facture</strong><small>Facturer une prestation ou des travaux</small></span><ArrowUpRight size={17}/></Link>
      <Link className="dashboard-shortcut" href="/achats"><span className="shortcut-icon"><ArrowDownRight size={18}/></span><span><strong>Enregistrer un coût</strong><small>Matériaux, sous-traitance, location ou transport</small></span><ArrowUpRight size={17}/></Link>
      <Link className="dashboard-shortcut" href="/caisse"><span className="shortcut-icon"><Wallet size={18}/></span><span><strong>Enregistrer un mouvement</strong><small>Entrée, sortie ou virement entre comptes</small></span><ArrowUpRight size={17}/></Link>
    </div>

    <div className="dashboard-two-col">
      <section className="card table-wrap"><div className="section-title"><div><h3>Documents récents</h3><p className="muted">Devis, factures et bons d’intervention</p></div><Link href="/ventes" className="dashboard-link">Tout voir <ArrowRight size={14}/></Link></div><table className="data-table"><thead><tr><th>Référence</th><th>Type</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead><tbody>
        {recentDocuments.map((doc: any) => <tr key={doc.id}><td><strong>{doc.reference}</strong></td><td>{documentLabels[doc.document_type] ?? doc.document_type}</td><td>{formatDate(doc.issue_date)}</td><td>{formatMoney(doc.total)}</td><td>{labelStatus(doc.status)}</td></tr>)}
        {!recentDocuments.length && <tr><td colSpan={5} className="muted">Aucun document enregistré. Créez votre premier devis ou document de prestation.</td></tr>}
      </tbody></table></section>

      <section className="card"><div className="section-title"><div><h3>Chantiers à suivre</h3><p className="muted">Vos opérations récentes</p></div><Link href="/chantiers" className="dashboard-link">Tout voir <ArrowRight size={14}/></Link></div>
        <div className="dashboard-project-list">{recentProjects.map((project: any) => <Link className="dashboard-project-row" href={`/chantiers/${project.id}`} key={project.id}><span className="dashboard-project-icon"><BriefcaseBusiness size={17}/></span><span className="dashboard-project-copy"><strong>{project.name}</strong><small>{project.reference} · {labelStatus(project.status)}</small></span><span className="dashboard-project-budget">{formatMoney(project.budget)}</span><ArrowUpRight size={15}/></Link>)}
          {!recentProjects.length && <p className="muted">Aucun chantier pour le moment. Créez un chantier pour suivre ses coûts et sa rentabilité.</p>}
        </div>
      </section>
    </div>

    <section className="dashboard-bottom-stats"><div className="card"><span className="stat-label">Déjà encaissé sur factures</span><strong>{formatMoney(Number(salesSummary.collected_total ?? 0))}</strong></div><div className="card"><span className="stat-label">Reste à payer aux fournisseurs</span><strong>{formatMoney(outstandingCosts)}</strong><small className="muted">Calculé sur les 100 achats les plus récents</small></div><div className="card"><span className="stat-label">Comptes financiers actifs</span><strong>{data.accounts.length}</strong><small className="muted">Caisse, banque, mobile money et autres</small></div></section>
  </Page>;
}
