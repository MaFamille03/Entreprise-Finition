'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function ProjectCreateForm({ companyId, clients }: { companyId: string; clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('projects').insert({
      company_id: companyId,
      client_id: String(form.get('client_id') || '') || null,
      reference: String(form.get('reference') || '').trim(),
      name: String(form.get('name') || '').trim(),
      address: String(form.get('address') || '').trim() || null,
      description: String(form.get('description') || '').trim() || null,
      status: String(form.get('status') || 'prospect'),
      start_date: String(form.get('start_date') || '') || null,
      expected_end_date: String(form.get('expected_end_date') || '') || null,
      budget: Number(form.get('budget') || 0),
      created_by: user.user?.id ?? null,
    }).select('id').single();
    if (error) { setError(error.message); setBusy(false); return; }
    router.push(`/chantiers/${data.id}`); router.refresh();
  }
  return <form className="card project-form" onSubmit={submit}>
    <div className="form-grid">
      <div><label className="label">Référence</label><input className="input" name="reference" placeholder="CH-2026-001" required /></div>
      <div><label className="label">Client</label><select className="input" name="client_id"><option value="">Sélectionner un client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label className="label">Nom du chantier</label><input className="input" name="name" placeholder="Rénovation immeuble ABC" required /></div>
      <div><label className="label">Montant du marché / budget</label><input className="input" name="budget" type="number" min="0" step="0.01" placeholder="0" /></div>
      <div><label className="label">Adresse du chantier</label><input className="input" name="address" placeholder="Cocody, Abidjan" /></div>
      <div><label className="label">Statut initial</label><select className="input" name="status"><option value="prospect">Prospect</option><option value="quote">Devis</option><option value="pending">En attente</option><option value="accepted">Accepté</option><option value="preparation">Préparation</option><option value="in_progress">En cours</option></select></div>
      <div><label className="label">Date de début</label><input className="input" name="start_date" type="date" /></div>
      <div><label className="label">Fin prévisionnelle</label><input className="input" name="expected_end_date" type="date" /></div>
      <div style={{ gridColumn: '1 / -1' }}><label className="label">Description</label><textarea className="input" name="description" rows={4} placeholder="Description des travaux et du projet..." /></div>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="page-actions project-form-actions"><Link className="btn btn-outline" href="/chantiers"><ArrowLeft size={16} /> Annuler</Link><button className="btn btn-primary" disabled={busy}><Save size={16} /> {busy ? 'Création...' : 'Créer le chantier'}</button></div>
  </form>;
}
