import { Page } from '@/components/ui/page';
import { getCurrentUserContext } from '@/lib/queries';
import { formatMoney, formatDate, labelStatus } from '@/lib/format';
import { SaleCreateForm } from './sale-create-form';

export default async function Ventes(){
 const {supabase,profile}=await getCurrentUserContext();
 if(!profile?.company_id) return <Page title="Ventes" description="Configurez d'abord votre entreprise."/>;
 const companyId=profile.company_id;
 const [{data:sales},{data:contacts},{data:items},{data:projects}]=await Promise.all([
  supabase.from('sales').select('id,reference,total,amount_paid,status,document_type,issue_date').eq('company_id',companyId).order('issue_date',{ascending:false}).limit(100),
  supabase.from('contacts').select('id,name,type').eq('company_id',companyId).eq('is_active',true).order('name'),
  supabase.from('items').select('id,name,sale_price,stock_quantity,is_stockable').eq('company_id',companyId).eq('is_active',true).order('name'),
  supabase.from('projects').select('id,name,reference').eq('company_id',companyId).order('name')
 ]);
 const rows=sales??[]; const revenue=rows.filter((s:any)=>s.document_type==='invoice').reduce((n,s)=>n+Number(s.total||0),0); const due=rows.reduce((n:number,s:any)=>n+Math.max(Number(s.total||0)-Number(s.amount_paid||0),0),0);
 return <Page title="Ventes" description="Devis, commandes, bons de livraison, factures, avoirs et paiements." action={<a className="btn btn-primary" href="#nouvelle-vente">+ Nouvelle vente</a>}>
  <div className="grid-cards"><div className="card"><div className="stat-label">Documents</div><div className="stat-value">{rows.length}</div></div><div className="card"><div className="stat-label">Facturé</div><div className="stat-value">{formatMoney(revenue)}</div></div><div className="card"><div className="stat-label">À encaisser</div><div className="stat-value">{formatMoney(due)}</div></div><div className="card"><div className="stat-label">Payé</div><div className="stat-value">{formatMoney(rows.reduce((n:number,s:any)=>n+Number(s.amount_paid||0),0))}</div></div></div>
  <div style={{height:18}}/><div id="nouvelle-vente"><SaleCreateForm companyId={companyId} contacts={contacts??[]} items={items??[]} projects={projects??[]}/></div>
  <div style={{height:18}}/><div className="card table-wrap"><table className="data-table"><thead><tr><th>N°</th><th>Type</th><th>Date</th><th>Total</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead><tbody>{rows.map((s:any)=><tr key={s.id}><td>{s.reference}</td><td>{s.document_type}</td><td>{formatDate(s.issue_date)}</td><td>{formatMoney(s.total)}</td><td>{formatMoney(s.amount_paid)}</td><td>{formatMoney(Math.max(Number(s.total||0)-Number(s.amount_paid||0),0))}</td><td>{labelStatus(s.status)}</td></tr>)}{rows.length===0&&<tr><td colSpan={7}>Aucune vente enregistrée.</td></tr>}</tbody></table></div>
 </Page>
}
