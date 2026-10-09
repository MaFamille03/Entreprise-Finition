'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

type Client = { id: string; name: string };

export default function ProjectCreateForm({ companyId, clients: initialClients }: { companyId: string; clients: Client[] }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '', city: 'Abidjan', tax_id: '' });
  const [busy, setBusy] = useState(false);
  const [clientBusy, setClientBusy] = useState(false);
  const [error, setError] = useState('');
  const [clientError, setClientError] = useState('');
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  async function addClient() {
    setClientError('');
    if (!newClient.name.trim()) { setClientError('Le nom du client est obligatoire.'); return; }
    setClientBusy(true);
    const { data, error: insertError } = await supabase.from('contacts').insert({
      company_id: companyId,
      type: 'client',
      name: newClient.name.trim(),
      phone: newClient.phone.trim() || null,
      email: newClient.email.trim() || null,
      address: newClient.address.trim() || null,
      city: newClient.city.trim() || null,
      tax_id: newClient.tax_id.trim() || null,
      is_active: true,
    }).select('id,name').single();
    setClientBusy(false);
    if (insertError) { setClientError(insertError.message); return; }
    const created = data as Client;
    setClients(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
    setClientId(created.id);
    setNewClient({ name: '', phone: '', email: '', address: '', city: 'Abidjan', tax_id: '' });
    setShowNewClient(false);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error: insertError } = await supabase.from('projects').insert({
      company_id: companyId,
      client_id: clientId || null,
      reference: String(form.get('reference') || '').trim(),
      name: String(form.get('name') || '').trim(),
      address: String(form.get('address') || '').trim() || null,
      description: String(form.get('description') || '').trim() || null,
      status: String(form.get('status') || 'prospect'),
      start_date: String(form.get('start_date') || '') || null,
      expected_end_date: String(form.get('expected_end_date') || '') || null,
      budget: Number(form.get('budget') || 0),
      created_by: auth.user?.id ?? null,
    }).select('id').single();
    if (insertError) { setError(insertError.message); setBusy(false); return; }
    router.push(`/chantiers/${data.id}`);
    router.refresh();
  }

  return <form className="card project-form" onSubmit={submit}>
    <h2 style={{ marginTop: 0 }}>1. Informations du chantier</h2>
    <div className="form-grid">
      <div><label className="label">Référence du chantier *</label><input className="input" name="reference" placeholder="CH-2026-001" required /></div>
      <div><label className="label">Nom du chantier / projet *</label><input className="input" name="name" placeholder="Rénovation d’un appartement" required /></div>
      <div><label className="label">Adresse du chantier</label><input className="input" name="address" placeholder="Commune, quartier, ville" /></div>
      <div><label className="label">Budget prévisionnel (FCFA)</label><input className="input" name="budget" type="number" min="0" step="1" defaultValue="0" /></div>
      <div><label className="label">Statut initial</label><select className="input" name="status" defaultValue="prospect"><option value="prospect">Prospect</option><option value="quote">Devis à préparer</option><option value="pending">En attente</option><option value="accepted">Accepté</option><option value="preparation">Préparation</option><option value="in_progress">En cours</option></select></div>
      <div><label className="label">Date de début prévue</label><input className="input" name="start_date" type="date" /></div>
      <div><label className="label">Fin prévisionnelle</label><input className="input" name="expected_end_date" type="date" /></div>
      <div style={{ gridColumn: '1 / -1' }}><label className="label">Description et périmètre des travaux</label><textarea className="input" name="description" rows={3} placeholder="Travaux prévus, contraintes et livrables…" /></div>
    </div>

    <div style={{ height: 22 }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <h2 style={{ margin: 0 }}>2. Client associé</h2>
      <button type="button" className="btn btn-outline" onClick={() => { setShowNewClient(v => !v); setClientError(''); }}>
        {showNewClient ? <X size={16} /> : <UserPlus size={16} />} {showNewClient ? 'Annuler' : 'Ajouter un nouveau client'}
      </button>
    </div>
    <div style={{ marginTop: 12 }}>
      <label className="label">Choisir un client existant</label>
      <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
        <option value="">Sélectionner un client (facultatif)</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
    {showNewClient && <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0 }}>Nouveau client</h3>
      <div className="form-grid">
        <div><label className="label">Nom / raison sociale *</label><input className="input" value={newClient.name} onChange={e => setNewClient(v => ({ ...v, name: e.target.value }))} required /></div>
        <div><label className="label">Téléphone</label><input className="input" value={newClient.phone} onChange={e => setNewClient(v => ({ ...v, phone: e.target.value }))} /></div>
        <div><label className="label">E-mail</label><input className="input" type="email" value={newClient.email} onChange={e => setNewClient(v => ({ ...v, email: e.target.value }))} /></div>
        <div><label className="label">Adresse</label><input className="input" value={newClient.address} onChange={e => setNewClient(v => ({ ...v, address: e.target.value }))} /></div>
        <div><label className="label">Ville</label><input className="input" value={newClient.city} onChange={e => setNewClient(v => ({ ...v, city: e.target.value }))} /></div>
        <div><label className="label">Identifiant fiscal (facultatif)</label><input className="input" value={newClient.tax_id} onChange={e => setNewClient(v => ({ ...v, tax_id: e.target.value }))} /></div>
      </div>
      {clientError && <p className="form-error">{clientError}</p>}
      <button type="button" className="btn btn-primary" disabled={clientBusy} onClick={addClient} style={{ marginTop: 12 }}>
        <UserPlus size={16} /> {clientBusy ? 'Création…' : 'Créer et sélectionner le client'}
      </button>
    </div>}
    {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
    <div className="page-actions project-form-actions">
      <Link className="btn btn-outline" href="/chantiers"><ArrowLeft size={16} /> Annuler</Link>
      <button className="btn btn-primary" disabled={busy}><Save size={16} /> {busy ? 'Création…' : 'Créer le chantier'}</button>
    </div>
  </form>;
}
