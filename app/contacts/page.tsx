import { Page } from '@/components/ui/page';
import { getDashboardData } from '@/lib/queries';
import { ContactManager } from './contact-manager';

export default async function Contacts(){
 const data=await getDashboardData(); const contacts=data?.contacts??[];
 return <Page title="Contacts" description="Clients, prospects, fournisseurs, prestataires et sous-traitants." action={<ContactManager/>}>
  <div className="card"><div className="form-grid"><div><label className="label">Recherche</label><input className="input" placeholder="Nom, téléphone, email..."/></div><div><label className="label">Type</label><select className="input"><option>Tous</option><option>Client</option><option>Prospect</option><option>Fournisseur</option><option>Prestataire</option><option>Sous-traitant</option></select></div></div></div><div style={{height:18}}/>
  <div className="card table-wrap"><table className="data-table"><thead><tr><th>Nom</th><th>Type</th><th>Téléphone</th><th>Email</th><th>Ville</th></tr></thead><tbody>{contacts.map((c:any)=><tr key={c.id}><td>{c.name}</td><td>{c.type}</td><td>{c.phone||'—'}</td><td>{c.email||'—'}</td><td>{c.city||'—'}</td></tr>)}{contacts.length===0&&<tr><td colSpan={5}>Aucun contact.</td></tr>}</tbody></table></div>
 </Page>;
}
