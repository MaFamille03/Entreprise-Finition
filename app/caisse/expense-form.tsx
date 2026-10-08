'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function ExpenseForm({ accounts, projects }: { accounts:any[]; projects:any[] }) {
  const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  const supabase=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  async function submit(e:any){e.preventDefault();setBusy(true);setMsg('');const f=new FormData(e.currentTarget);const {data:{user}}=await supabase.auth.getUser();
    if(!user){setMsg('Session expirée.');setBusy(false);return;}
    const {data:p}=await supabase.from('profiles').select('company_id').eq('id',user.id).single();
    if(!p?.company_id){setMsg('Entreprise introuvable.');setBusy(false);return;}
    const {error}=await supabase.rpc('record_expense',{p_company_id:p.company_id,p_account_id:f.get('account_id'),p_project_id:f.get('project_id')||null,p_contact_id:null,p_category:f.get('category'),p_label:f.get('label'),p_amount:Number(f.get('amount')),p_expense_date:f.get('date')||null,p_reference:f.get('reference')||null,p_notes:f.get('notes')||null});
    setMsg(error?error.message:'Dépense enregistrée.'); if(!error)e.currentTarget.reset(); setBusy(false);
  }
  return <form id="nouvelle-operation" className="card form-grid" onSubmit={submit}>
    <h3>Nouvelle dépense</h3><select name="account_id" required defaultValue=""><option value="" disabled>Compte</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <select name="category" defaultValue="other"><option value="materials">Matériaux</option><option value="labor">Main-d'œuvre</option><option value="subcontracting">Sous-traitance</option><option value="transport">Transport</option><option value="utilities">Charges</option><option value="other">Autre</option></select>
    <input name="label" placeholder="Libellé" required/><input name="amount" type="number" min="0.01" step="0.01" placeholder="Montant FCFA" required/>
    <input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/><select name="project_id" defaultValue=""><option value="">Aucun chantier</option>{projects.map(p=><option key={p.id} value={p.id}>{p.reference} — {p.name}</option>)}</select>
    <input name="reference" placeholder="Référence (facultatif)"/><input name="notes" placeholder="Note"/><button className="btn btn-primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer la dépense'}</button>{msg&&<div className="muted">{msg}</div>}
  </form>
}
