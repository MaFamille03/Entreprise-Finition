'use client';

import { useEffect, useState } from 'react';
import { Page } from '@/components/ui/page';
import { formatMoney } from '@/lib/format';

export default function Rapports() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/reports/summary')
      .then((response) => response.json())
      .then((result) => result.error ? setError(result.error) : setData(result))
      .catch(() => setError('Impossible de charger les rapports.'))
      .finally(() => setLoading(false));
  }, []);
  const sales = data?.sales || {};
  const purchases = data?.purchases || {};
  const financial = data?.financial || {};
  const stock = data?.stock || {};
  return <Page title="Rapports de gestion" description="Analysez la facturation des prestations, les coûts, les règlements et la rentabilité des chantiers.">
    {error && <div className="card" role="alert">{error}</div>}
    {loading && <div className="card muted">Chargement des indicateurs…</div>}
    <div className="grid-cards">
      <div className="card"><div className="stat-label">Prestations facturées</div><div className="stat-value">{formatMoney(sales.invoiced_total || 0)}</div></div>
      <div className="card"><div className="stat-label">Créances clients</div><div className="stat-value">{formatMoney(sales.receivable_total || 0)}</div></div>
      <div className="card"><div className="stat-label">Achats & coûts engagés</div><div className="stat-value">{formatMoney(purchases.purchased_total || 0)}</div></div>
      <div className="card"><div className="stat-label">Reste à payer aux fournisseurs</div><div className="stat-value">{formatMoney(purchases.payable_total || 0)}</div></div>
      <div className="card"><div className="stat-label">Encaissements de trésorerie</div><div className="stat-value">{formatMoney(financial.total_income || 0)}</div></div>
      <div className="card"><div className="stat-label">Décaissements de trésorerie</div><div className="stat-value">{formatMoney(financial.total_expense || 0)}</div></div>
      <div className="card"><div className="stat-label">Valeur indicative des matériaux suivis</div><div className="stat-value">{formatMoney(stock.stock_purchase_value || 0)}</div></div>
      <div className="card"><div className="stat-label">Alertes matériaux</div><div className="stat-value">{stock.low_stock_items || 0}</div></div>
    </div>
    <div style={{ height: 18 }} />
    <div className="card table-wrap"><h3 style={{ marginTop: 0 }}>Rentabilité par chantier</h3><p className="muted">Comparez le chiffre d’affaires rattaché à chaque chantier aux coûts enregistrés dans l’application.</p><table className="data-table"><thead><tr><th>Référence</th><th>Chantier</th><th>Prestations facturées</th><th>Coûts</th><th>Marge estimée</th></tr></thead><tbody>
      {(data?.projects || []).map((project: any) => <tr key={project.project_id}><td>{project.reference || '—'}</td><td>{project.name}</td><td>{formatMoney(project.revenue)}</td><td>{formatMoney(project.cost)}</td><td><strong>{formatMoney(project.margin)}</strong></td></tr>)}
      {!data?.projects?.length && !loading && <tr><td colSpan={5}>Aucun chantier à analyser.</td></tr>}
    </tbody></table></div>
  </Page>;
}
