import { Page } from '@/components/ui/page';
import { getDashboardData } from '@/lib/queries';
import { formatMoney } from '@/lib/format';
import { ItemManager } from './item-manager';

export default async function Materiaux() {
  const data = await getDashboardData();
  const items = (data?.items ?? []).filter((item: any) => item.item_type !== 'service');
  const value = items.reduce((sum: number, item: any) => sum + Number(item.stock_quantity || 0) * Number(item.purchase_price || 0), 0);
  const low = items.filter((item: any) => Number(item.stock_quantity) <= Number(item.min_stock_quantity));
  const out = items.filter((item: any) => Number(item.stock_quantity) <= 0);
  return <Page title="Matériaux & consommables" description="Suivi facultatif des matériaux, fournitures et consommables utilisés sur les chantiers." action={<ItemManager />}>
    <div className="card" style={{ marginBottom: 18 }}><strong>Un outil de suivi des coûts, pas une boutique.</strong><p className="muted" style={{ marginBottom: 0 }}>Les prestations se facturent depuis le module Prestations & facturation. Utilisez cette page uniquement si vous souhaitez contrôler vos matériaux et consommables.</p></div>
    <div className="grid-cards"><div className="card"><div className="stat-label">Références suivies</div><div className="stat-value">{items.length}</div></div><div className="card"><div className="stat-label">Valeur indicative des matériaux</div><div className="stat-value">{formatMoney(value)}</div></div><div className="card"><div className="stat-label">Sous le seuil minimum</div><div className="stat-value">{low.length}</div></div><div className="card"><div className="stat-label">Ruptures</div><div className="stat-value">{out.length}</div></div></div>
    <div style={{ height: 18 }} />
    <div className="card table-wrap"><table className="data-table"><thead><tr><th>Référence</th><th>Désignation</th><th>Unité</th><th>Quantité disponible</th><th>Seuil d’alerte</th><th>Coût unitaire</th></tr></thead><tbody>
      {items.map((item: any) => <tr key={item.id}><td>{item.sku || '—'}</td><td>{item.name}</td><td>{item.unit}</td><td>{item.stock_quantity}</td><td>{item.min_stock_quantity}</td><td>{formatMoney(item.purchase_price)}</td></tr>)}
      {items.length === 0 && <tr><td colSpan={6}>Aucun matériau suivi. Vous pouvez utiliser l’application sans gérer de stock.</td></tr>}
    </tbody></table></div>
  </Page>;
}
