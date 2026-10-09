'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Contact = { id: string; name: string; type: string };
type Project = { id: string; name: string; reference: string };

export function SaleCreateForm({ companyId, contacts, projects }: { companyId: string; contacts: Contact[]; projects: Project[] }) {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('quote');
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('0');
  const [vatRate, setVatRate] = useState('18');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg('');
    setIsError(false);
    if (!description.trim()) {
      setMsg('Renseignez la désignation de la prestation.');
      setIsError(true);
      return;
    }
    if (!Number.isFinite(Number(qty)) || Number(qty) <= 0 || !Number.isFinite(Number(price)) || Number(price) < 0) {
      setMsg('Vérifiez la quantité et le prix unitaire.');
      setIsError(true);
      return;
    }

    setBusy(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.rpc('create_sale_document', {
      p_company_id: companyId,
      p_document_type: type,
      p_client_id: clientId || null,
      p_project_id: projectId || null,
      p_issue_date: new Date().toISOString().slice(0, 10),
      p_due_date: null,
      p_discount: 0,
      p_notes: null,
      p_lines: [{ item_id: null, description: description.trim(), quantity: Number(qty), unit_price: Number(price), discount: 0, vat_rate: Number(vatRate) }],
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      setIsError(true);
      return;
    }
    setMsg('Document de prestation créé.');
    window.location.reload();
  }

  return (
    <form onSubmit={submit} className="card form-grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>Créer un document de prestation</h2>
        <p className="muted" style={{ margin: 0 }}>Décrivez directement le service réalisé ou à réaliser. Vous pouvez facturer un service sans gérer de stock.</p>
      </div>
      <div>
        <label className="label" htmlFor="service-document-type">Document</label>
        <select id="service-document-type" className="input" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="quote">Devis</option>
          <option value="invoice">Facture</option>
          <option value="order">Bon de commande / accord</option>
          <option value="delivery_note">Bon d’intervention / livraison</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="service-client">Client</label>
        <select id="service-client" className="input" value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">Sélectionner un client (facultatif)</option>
          {contacts.filter((contact) => ['client', 'prospect'].includes(contact.type)).map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="service-project">Chantier concerné</label>
        <select id="service-project" className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Aucun chantier lié</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.reference} — {project.name}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label className="label" htmlFor="service-description">Désignation de la prestation *</label>
        <input id="service-description" className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex. Pose de carrelage, peinture intérieure, installation électrique…" required />
      </div>
      <div>
        <label className="label" htmlFor="service-quantity">Quantité / nombre d’unités</label>
        <input id="service-quantity" className="input" type="number" min="0.001" step="0.001" value={qty} onChange={(event) => setQty(event.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="service-unit-price">Prix unitaire HT (FCFA)</label>
        <input id="service-unit-price" className="input" type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="service-vat">TVA</label>
        <select id="service-vat" className="input" value={vatRate} onChange={(event) => setVatRate(event.target.value)}>
          <option value="18">18 %</option>
          <option value="0">0 %</option>
        </select>
      </div>
      <div className="muted" style={{ alignSelf: 'end', fontSize: 12 }}>Montant HT : {(Math.max(0, Number(qty) || 0) * Math.max(0, Number(price) || 0)).toLocaleString('fr-FR')} FCFA</div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Création…' : 'Créer le document'}</button>
        {msg && <p className={isError ? 'error' : 'notice'} role="status" style={{ marginTop: 10 }}>{msg}</p>}
      </div>
    </form>
  );
}
