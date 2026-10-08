import {Page} from '@/components/ui/page';
import {createClient} from '@/lib/supabase-server';
import {redirect} from 'next/navigation';

const roles = ['admin','director','sales','cashier','warehouse','accountant','site_manager'];
const labels:Record<string,string>={admin:'Administrateur',director:'Directeur',sales:'Commercial',cashier:'Caissier',warehouse:'Magasinier',accountant:'Comptable',site_manager:'Chef de chantier'};

export default async function UsersPage(){
  const supabase=await createClient();
  const {data:me}=await supabase.from('profiles').select('role,company_id').single();
  if(!me?.company_id || !['admin','director'].includes(me.role)) redirect('/administration');
  const {data:users}=await supabase.from('profiles').select('id,full_name,role,is_active,created_at').eq('company_id',me.company_id).order('created_at');
  return <Page title="Utilisateurs & rôles" description="Contrôle des accès de l'entreprise.">
    <div className="card" style={{marginBottom:18}}><h3 style={{marginTop:0}}>Rôles disponibles</h3><div className="grid-cards">{roles.map(r=><div className="card" key={r}><strong>{labels[r]}</strong><div className="muted" style={{fontSize:13,marginTop:6}}>{r}</div></div>)}</div></div>
    <div className="card table-wrap"><table className="data-table"><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Créé le</th></tr></thead><tbody>{(users??[]).map((u:any)=><tr key={u.id}><td>{u.full_name||'Utilisateur sans nom'}</td><td>{labels[u.role]||u.role}</td><td>{u.is_active?'Actif':'Désactivé'}</td><td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div>
  </Page>;
}
