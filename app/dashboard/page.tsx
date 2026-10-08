import Link from 'next/link';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, CircleAlert, CreditCard, FilePlus2, Package, Plus, ReceiptText, ShoppingCart, TrendingUp, Users, WalletCards } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { getDashboardData } from '@/lib/queries';
import { formatMoney, formatDate, labelStatus } from '@/lib/format';

type Sale = {
  id: string;
  total: number;
  amount_paid: number;
  status: string;
  document_type: string;
  issue_date: string;
};

type Purchase = {
  id: string;
  total: number;
  amount_paid: number;
  status: string;
  issue_date: string;
};

type Item = {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_quantity: number;
  purchase_price: number;
  sale_price: number;
  unit: string;
  sku?: string | null;
};

type Project = {
  id: string;
  name: string;
  reference: string;
  status: string;
  budget: number;
};

type Transaction = {
  id: string;
  amount: number;
  type: string;
  transaction_date: string;
  label: string;
};

const documentLabels: Record<string, string> = {
  invoice: 'Facture',
  order: 'Commande',
  quote: 'Devis',
  delivery_note: 'Bon de livraison',
  credit_note: 'Avoir',
};

const transactionLabels: Record<string, string> = {
  income: 'Encaissement',
  customer_payment: 'Paiement client',
  expense: 'Dépense',
  supplier_payment: 'Paiement fournisseur',
  transfer_in: 'Entrée',
  transfer_out: 'Sortie',
  refund: 'Remboursement',
};

function formatCompactMoney(value: number) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M FCFA`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)} K FCFA`;
  return `${Math.round(n)} FCFA`;
}

function StatCard({ title, value, icon: Icon, tone, detail }: { title: string; value: string; icon: typeof WalletCards; tone: string; detail: string }) {
  return (
    <div className="dashboard-stat">
      <div className={`dashboard-stat-icon ${tone}`}><Icon size={19} strokeWidth={2} /></div>
      <div className="dashboard-stat-body">
        <span className="dashboard-stat-title">{title}</span>
        <strong>{value}</strong>
        <span className="dashboard-stat-detail">{detail}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, href, action = 'Voir tout' }: { title: string; description?: string; href?: string; action?: string }) {
  return (
    <div className="dashboard-section-head">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && <Link href={href} className="dashboard-link">{action}<ArrowRight size={14} /></Link>}
    </div>
  );
}

export default async function Dashboard() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <Page title="Tableau de bord" description="Pilotez votre activité depuis un seul espace.">
        <div className="card empty-state">
          <h3>Entreprise non configurée</h3>
          <p>Terminez la configuration de votre entreprise pour commencer à utiliser Finition ERP.</p>
          <a className="btn btn-primary" href="/onboarding">Configurer l’entreprise</a>
        </div>
      </Page>
    );
  }

  const sales = data.sales as Sale[];
  const purchases = data.purchases as Purchase[];
  const items = data.items as Item[];
  const projects = data.projects as Project[];
  const transactions = data.transactions as Transaction[];

  const invoices = sales.filter((sale) => sale.document_type === 'invoice' && sale.status !== 'cancelled');
  const orders = sales.filter((sale) => sale.document_type === 'order' && sale.status !== 'cancelled');
  const revenue = invoices.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const collected = invoices.reduce((sum, sale) => sum + Number(sale.amount_paid || 0), 0);
  const receivable = invoices.reduce((sum, sale) => sum + Math.max(Number(sale.total || 0) - Number(sale.amount_paid || 0), 0), 0);
  const payable = purchases.reduce((sum, purchase) => sum + Math.max(Number(purchase.total || 0) - Number(purchase.amount_paid || 0), 0), 0);
  const purchasesTotal = purchases.filter((purchase) => purchase.status !== 'cancelled').reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
  const stockValue = items.reduce((sum, item) => sum + Number(item.stock_quantity || 0) * Number(item.purchase_price || 0), 0);
  const cash = data.accounts.reduce((sum: number, account: any) => sum + Number(account.current_balance || 0), 0);
  const lowStock = items.filter((item) => Number(item.stock_quantity) <= Number(item.min_stock_quantity));
  const outOfStock = items.filter((item) => Number(item.stock_quantity) <= 0);
  const activeProjects = projects.filter((project) => ['in_progress', 'preparation'].includes(project.status));
  const projectBudget = activeProjects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
  const recentTransactions = transactions.slice(0, 6);
  const recentSales = sales.filter((sale) => sale.status !== 'cancelled').slice(0, 6);

  return (
    <Page title="Tableau de bord" description="La situation de votre entreprise, en un coup d’œil.">
      <div className="dashboard-shell">
        <section className="dashboard-welcome">
          <div>
            <span className="dashboard-eyebrow">PILOTAGE DE L’ACTIVITÉ</span>
            <h2>Vue d’ensemble</h2>
            <p>Retrouvez les chiffres importants, les opérations récentes et les éléments qui nécessitent votre attention.</p>
          </div>
          <div className="dashboard-date">Données actualisées à l’ouverture de la page</div>
        </section>

        <section className="dashboard-stat-grid" aria-label="Indicateurs financiers">
          <StatCard title="Chiffre d’affaires" value={formatCompactMoney(revenue)} icon={TrendingUp} tone="violet" detail={`${invoices.length} facture${invoices.length > 1 ? 's' : ''} enregistrée${invoices.length > 1 ? 's' : ''}`} />
          <StatCard title="Trésorerie" value={formatCompactMoney(cash)} icon={WalletCards} tone="blue" detail="Tous les comptes financiers" />
          <StatCard title="Créances clients" value={formatCompactMoney(receivable)} icon={ArrowUpRight} tone="orange" detail={`${formatCompactMoney(collected)} déjà encaissés`} />
          <StatCard title="Dettes fournisseurs" value={formatCompactMoney(payable)} icon={ArrowDownLeft} tone="red" detail={`${formatCompactMoney(purchasesTotal)} d’achats enregistrés`} />
        </section>

        <section className="dashboard-quick-actions">
          <div>
            <span className="dashboard-eyebrow">ACCÈS RAPIDE</span>
            <h2>Que souhaitez-vous faire ?</h2>
          </div>
          <div className="quick-action-grid">
            <Link href="/ventes" className="quick-action"><span><FilePlus2 size={18} /></span><div><strong>Nouvelle vente</strong><small>Devis, commande ou facture</small></div><ArrowRight size={15} /></Link>
            <Link href="/chantiers" className="quick-action"><span><BriefcaseBusiness size={18} /></span><div><strong>Nouveau chantier</strong><small>Créer et suivre un projet</small></div><ArrowRight size={15} /></Link>
            <Link href="/stock" className="quick-action"><span><Package size={18} /></span><div><strong>Gérer le stock</strong><small>Articles et mouvements</small></div><ArrowRight size={15} /></Link>
            <Link href="/contacts" className="quick-action"><span><Users size={18} /></span><div><strong>Nouveau contact</strong><small>Client, fournisseur ou prospect</small></div><ArrowRight size={15} /></Link>
          </div>
        </section>

        <div className="dashboard-main-grid">
          <section className="dashboard-panel">
            <SectionHeader title="Activité commerciale" description="Les dernières ventes et documents commerciaux." href="/ventes" />
            <div className="dashboard-table-wrap">
              <table className="data-table dashboard-table">
                <thead><tr><th>Référence</th><th>Type</th><th>Date</th><th>Statut</th><th className="align-right">Montant</th></tr></thead>
                <tbody>
                  {recentSales.map((sale: any) => (
                    <tr key={sale.id}>
                      <td><strong>{sale.reference || 'Document'}</strong></td>
                      <td>{documentLabels[sale.document_type] || sale.document_type}</td>
                      <td>{formatDate(sale.issue_date)}</td>
                      <td><span className="dashboard-badge">{labelStatus(sale.status)}</span></td>
                      <td className="align-right"><strong>{formatMoney(sale.total)}</strong></td>
                    </tr>
                  ))}
                  {recentSales.length === 0 && <tr><td colSpan={5}><div className="dashboard-empty">Aucune activité commerciale récente.</div></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="dashboard-panel-footer"><span>{orders.length} commande{orders.length > 1 ? 's' : ''} en cours dans les données chargées.</span><Link href="/ventes">Ouvrir les ventes <ArrowRight size={14} /></Link></div>
          </section>

          <section className="dashboard-panel dashboard-attention">
            <SectionHeader title="À surveiller" description="Les éléments nécessitant votre attention." href="/stock" action="Gérer" />
            <div className="attention-summary">
              <div><span className="attention-number danger">{outOfStock.length}</span><div><strong>Rupture de stock</strong><small>Article{outOfStock.length > 1 ? 's' : ''} à zéro</small></div></div>
              <div><span className="attention-number warning">{lowStock.length}</span><div><strong>Stock faible</strong><small>Sous le seuil minimum</small></div></div>
              <div><span className="attention-number orange">{invoices.filter((sale) => Number(sale.total) > Number(sale.amount_paid)).length}</span><div><strong>Factures à recouvrer</strong><small>Avec un solde restant</small></div></div>
            </div>
            <div className="attention-note"><CircleAlert size={17} /><span>Priorisez les ruptures et les créances avant les tâches secondaires.</span></div>
          </section>
        </div>

        <div className="dashboard-three-grid">
          <section className="dashboard-panel">
            <SectionHeader title="Stock" description="État actuel de vos articles." href="/stock" />
            <div className="mini-metrics">
              <div><span>Valeur du stock</span><strong>{formatMoney(stockValue)}</strong></div>
              <div><span>Articles actifs</span><strong>{items.length}</strong></div>
            </div>
            <div className="dashboard-list">
              {lowStock.slice(0, 5).map((item) => (
                <div className="dashboard-list-row" key={item.id}><div><strong>{item.name}</strong><small>Seuil : {item.min_stock_quantity} {item.unit}</small></div><span className={Number(item.stock_quantity) <= 0 ? 'stock-danger' : 'stock-warning'}>{item.stock_quantity} {item.unit}</span></div>
              ))}
              {lowStock.length === 0 && <div className="dashboard-empty">Aucun article sous le seuil minimum.</div>}
            </div>
          </section>

          <section className="dashboard-panel">
            <SectionHeader title="Chantiers" description="Projets actuellement actifs." href="/chantiers" />
            <div className="mini-metrics"><div><span>En cours</span><strong>{activeProjects.length}</strong></div><div><span>Budget cumulé</span><strong>{formatCompactMoney(projectBudget)}</strong></div></div>
            <div className="dashboard-list">
              {activeProjects.slice(0, 5).map((project) => (
                <div className="dashboard-list-row" key={project.id}><div><strong>{project.name}</strong><small>{project.reference}</small></div><span className="dashboard-badge">{labelStatus(project.status)}</span></div>
              ))}
              {activeProjects.length === 0 && <div className="dashboard-empty">Aucun chantier en cours.</div>}
            </div>
          </section>

          <section className="dashboard-panel">
            <SectionHeader title="Trésorerie" description="Derniers mouvements financiers." href="/caisse" />
            <div className="cash-total"><WalletCards size={18} /><div><span>Solde global</span><strong>{formatMoney(cash)}</strong></div></div>
            <div className="dashboard-list">
              {recentTransactions.slice(0, 5).map((transaction) => {
                const positive = ['income', 'customer_payment', 'transfer_in'].includes(transaction.type);
                return <div className="dashboard-list-row" key={transaction.id}><div><strong>{transaction.label}</strong><small>{formatDate(transaction.transaction_date)} · {transactionLabels[transaction.type] || transaction.type}</small></div><span className={positive ? 'money-positive' : 'money-negative'}>{positive ? '+' : '-'}{formatMoney(transaction.amount)}</span></div>;
              })}
              {recentTransactions.length === 0 && <div className="dashboard-empty">Aucun mouvement financier.</div>}
            </div>
          </section>
        </div>

        <section className="dashboard-bottom-links">
          <Link href="/rapports"><ReceiptText size={18} /><div><strong>Rapports</strong><span>Analysez les performances de l’entreprise.</span></div><ArrowRight size={16} /></Link>
          <Link href="/achats"><ShoppingCart size={18} /><div><strong>Achats fournisseurs</strong><span>Suivez les achats et les dettes.</span></div><ArrowRight size={16} /></Link>
          <Link href="/caisse"><CreditCard size={18} /><div><strong>Caisse & trésorerie</strong><span>Consultez les comptes et mouvements.</span></div><ArrowRight size={16} /></Link>
          <Link href="/contacts"><Plus size={18} /><div><strong>Contacts</strong><span>Clients, fournisseurs et prospects.</span></div><ArrowRight size={16} /></Link>
        </section>
      </div>
    </Page>
  );
}
