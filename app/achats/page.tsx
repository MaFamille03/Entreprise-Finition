import { Page } from '@/components/ui/page';
import { getCurrentUserContext } from '@/lib/queries';
import { formatMoney, formatDate, labelStatus } from '@/lib/format';
import { PurchaseCreateForm } from './purchase-create-form';

export default async function Achats(){
 const {supabase,profile}=await getCurrentUserContext(); if(!profile?.company_id) return <Page title="Achats" description="Configurez d'abord votre entreprise."/>; const companyId=profile.company_id;
 const [{data:purchases},{data:suppliers},{data:items},{data:projects}]=await Promise.all([
  supabase.from('purchases').select('id,reference,total,amount_paid,status,issue_date').eq('company_id',companyId).order('issue_date',{ascending:false}).limit(100),
  supabase.from('contacts').select('id,name,type').eq('company_id',companyId).eq('type','supplier').eq('is_active',true).order('name'),
  supabase.from('items').select('id,name,purchase_price').eq('company_id',companyId).eq('is_active',true).order('name'),
  supabase.from('projects').select('id,name,reference').eq('company_id',companyId).order('name')
 ]); const rows=purchases??[]; const total=rows.reduce((n:number,p:any)=>n+Number(p.total||0),0); const due=rows.reduce((n:number,p:any)=>n+Math.max(Number(p.total||0)-Number(p.amount_paid||0),0),0);
 return <Page title="Achats" description="Approvisionnement, commandes fournisseurs, réceptions et paiements." action={<a className="btn btn-primary" href="#nouvel-achat">+ Nouvel achat</a>}><div className="grid-cards"><div className="card"><div className="stat-label">Documents</div><div className="stat-value">{rows.length}</div></div><div className="card"><div className="stat-label">Total achats</div><div className="stat-value">{formatMoney(total)}</div></div><div className="card"><div className="stat-label">Dettes fournisseurs</div><div className="stat-value">{formatMoney(due)}</div></div><div className="card"><div className="stat-label">Payé</div><div className="stat-value">{formatMoney(rows.reduce((n:number,p:any)=>n+Number(p.amount_paid||0),0))}</div></div></div><div style={{height:18}}/><div id="nouvel-achat"><PurchaseCreateForm companyId={companyId} suppliers={suppliers??[]} items={items??[]} projects={projects??[]}/></div><div style={{height:18}}/><div className="card table-wrap"><table className="data-table"><thead><tr><th>N°</th><th>Date</th><th>Total</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead><tbody>{rows.map((p:any)=><tr key={p.id}><td>{p.reference}</td><td>{formatDate(p.issue_date)}</td><td>{formatMoney(p.total)}</td><td>{formatMoney(p.amount_paid)}</td><td>{formatMoney(Math.max(Number(p.total||0)-Number(p.amount_paid||0),0))}</td><td>{labelStatus(p.status)}</td></tr>)}{rows.length===0&&<tr><td colSpan={6}>Aucun achat enregistré.</td></tr>}</tbody></table></div></Page>
}
