'use client';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export function OnboardingForm(){
  const [name,setName]=useState(''); const [fullName,setFullName]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const router=useRouter();
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError('');const supabase=createClient();const {error}=await supabase.rpc('bootstrap_company',{p_name:name,p_full_name:fullName||null});if(error){setError(error.message);setLoading(false);return;}router.replace('/dashboard');router.refresh();}
  return <form onSubmit={submit}><div><label className="label">Nom de l'entreprise</label><input required className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex. BATI FINITION SARL"/></div><div style={{height:14}}/><div><label className="label">Votre nom</label><input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nom complet"/></div>{error&&<p className="error">{error}</p>}<button className="btn btn-primary full" disabled={loading}>{loading?'Initialisation…':'Créer l’entreprise'}</button></form>;
}
