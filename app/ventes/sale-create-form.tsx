'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plus, Trash2, FileText } from 'lucide-react';

type Contact = { id: string; name: string; type: string };
type Project = { id: string; name: string; reference: string };
type Line = { description: string; unit: string; quantity: string; unit_price: string; discount: string };

const emptyLine = (): Line => ({ description: '', unit: 'forfait', quantity: '1', unit_price: '0', discount: '0' });
const money = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA';

export function SaleCreateForm({ companyId, contacts, projects }: { companyId: string; contacts: Contact[]; projects: Project[] }) {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('quote');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState('18');
  const [discount, setDiscount] = useState('0');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unit_price) || 0), 0);
    const lineDiscount = lines.reduce((sum, line) => {
      const gross = Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unit_price) || 0);
      return sum + Math.min(Math.max(0, Number(line.discount) || 0), gross);
    }, 0);
    const globalDiscount = Math.min(Math.max(0, Number(discount) || 0), Math.max(0, subtotal - lineDiscount));
    const base = Math.max(0, subtotal - lineDiscount - globalDiscount);
    const vat = vatEnabled ? base * (Math.max(0, Number(vatRate) || 0) / 100) : 0;
    return { subtotal, lineDiscount, globalDiscount, base, vat, total: base + vat };
  }, [lines, discount, vatEnabled, vatRate]);

  function updateLine(index: number, field: keyof Line, value: string) {
    setLines(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg('');
    setIsError(false);
    if (!clientId) { setMsg('Sélectionnez un client.'); setIsError(true); return; }
    if (lines.some(line => !line.description.trim() || !(Number(line.quantity) > 0) || !(Number(line.unit_price) >= 0) || !(Number(line.discount) >= 0))) {
      setMsg('Chaque ligne doit comporter une désignation, une quantité positive et des montants valides.');
      setIsError(true); return;
    }
    if (Number(discount) < 0) { setMsg('La remise globale ne peut pas être négative.'); setIsError(true); return; }

    setBusy(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.rpc('create_sale_document', {
      p_company_id: companyId,
      p_document_type: type,
      p_client_id: clientId,
      p_project_id: projectId || null,
      p_issue_date: issueDate,
      p_due_date: dueDate || null,
      p_discount: Number(discount) || 0,
      p_notes: notes.trim() || null,
      p_lines: lines.map(line => ({
        item_id: null,
        description: `${line.description.trim()}${line.unit && line.unit !== 'forfait' ? ` (${line.unit})` : ''}`,
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        discount: Number(line.discount) || 0,
        vat_rate: vatEnabled ? Number(vatRate) : 0,
      })),
    });
    setBusy(false);
    if (error) { setMsg(error.message); setIsError(true); return; }
    setMsg(`${type === 'quote' ? 'Devis' : type === 'invoice' ? 'Facture' : 'Document'} enregistré avec succès${data ? ` (référence interne créée)` : ''}.`);
    window.location.reload();
  }

  return <form onSubmit={submit} className="card" id="nouveau-document">
    <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 18 }}>
      <FileText size={22} />
      <div><h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Nouveau devis ou document de facturation</h2><p className="muted" style={{ margin: 0 }}>Renseignez le client, le chantier éventuel et autant de lignes de travaux ou prestations que nécessaire.</p></div>
    </div>

    <h3>1. Informations générales</h3>
    <div className="form-grid">
      <div><label className="label">Type de document *</label><select className="input" value={type} onChange={e => setType(e.target.value)}><option value="quote">Devis</option><option value="invoice">Facture</option><option value="order">Bon de commande / accord</option><option value="delivery_note">Bon d’intervention</option></select></div>
      <div><label className="label">Client *</label><select className="input" value={clientId} onChange={e => setClientId(e.target.value)} required><option value="">Sélectionner un client</option>{contacts.filter(c => ['client', 'prospect'].includes(c.type)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label className="label">Chantier associé</label><select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">Aucun chantier</option>{projects.map(p => <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>)}</select></div>
      <div><label className="label">Date du document *</label><input className="input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required /></div>
      <div><label className="label">{type === 'quote' ? 'Date limite de validité' : 'Échéance de paiement'}</label><input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
      <div><label className="label">Remise globale (FCFA)</label><input className="input" type="number" min="0" step="1" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
      <h3 style={{ margin: 0 }}>2. Détail des travaux et prestations</h3>
      <button type="button" className="btn btn-outline" onClick={() => setLines(prev => [...prev, emptyLine()])}><Plus size={16} /> Ajouter une ligne</button>
    </div>
    <div className="table-wrap" style={{ marginTop: 12 }}>
      <table className="data-table">
        <thead><tr><th>Désignation *</th><th>Unité</th><th>Qté</th><th>Prix unitaire HT (FCFA)</th><th>Remise (FCFA)</th><th>Net HT</th><th>Action</th></tr></thead>
        <tbody>{lines.map((line, index) => {
          const gross = Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unit_price) || 0);
          const net = Math.max(0, gross - Math.max(0, Number(line.discount) || 0));
          return <tr key={index}>
            <td style={{ minWidth: 240 }}><input aria-label={`Désignation ligne ${index + 1}`} className="input" value={line.description} onChange={e => updateLine(index, 'description', e.target.value)} placeholder="Ex. Préparation et peinture des murs" required /></td>
            <td style={{ minWidth: 110 }}><select aria-label="Unité" className="input" value={line.unit} onChange={e => updateLine(index, 'unit', e.target.value)}><option value="forfait">Forfait</option><option value="m²">m²</option><option value="m³">m³</option><option value="ml">ml</option><option value="unité">Unité</option><option value="jour">Jour</option><option value="heure">Heure</option><option value="lot">Lot</option></select></td>
            <td style={{ minWidth: 90 }}><input aria-label="Quantité" className="input" type="number" min="0.001" step="0.001" value={line.quantity} onChange={e => updateLine(index, 'quantity', e.target.value)} required /></td>
            <td style={{ minWidth: 145 }}><input aria-label="Prix unitaire HT" className="input" type="number" min="0" step="1" value={line.unit_price} onChange={e => updateLine(index, 'unit_price', e.target.value)} required /></td>
            <td style={{ minWidth: 125 }}><input aria-label="Remise ligne" className="input" type="number" min="0" step="1" value={line.discount} onChange={e => updateLine(index, 'discount', e.target.value)} /></td>
            <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{money(net)}</td>
            <td><button type="button" className="btn btn-outline" aria-label={`Supprimer ligne ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(prev => prev.filter((_, i) => i !== index))}><Trash2 size={15} /></button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>

    <h3 style={{ marginTop: 24 }}>3. TVA et conditions</h3>
    <div className="form-grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} />
          <span><strong>Appliquer la TVA à ce document</strong><br /><small className="muted">Décochez si la TVA n’est pas facturée pour cette opération, sous réserve de votre régime fiscal.</small></span>
        </label>
      </div>
      {vatEnabled && <div><label className="label">Taux de TVA</label><select className="input" value={vatRate} onChange={e => setVatRate(e.target.value)}><option value="18">18 % — taux normal si applicable</option><option value="9">9 % — uniquement si l’opération est éligible</option></select></div>}
      <div><label className="label">Notes / conditions de paiement</label><textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Validité du devis, délai d’exécution, modalités de règlement…" /></div>
    </div>

    <div className="card" style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 440 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}><span>Total brut HT</span><strong>{money(totals.subtotal)}</strong></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}><span>Remises lignes</span><span>− {money(totals.lineDiscount)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}><span>Remise globale</span><span>− {money(totals.globalDiscount)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}><span>Montant HT net</span><strong>{money(totals.base)}</strong></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}><span>TVA {vatEnabled ? `${vatRate}%` : '(non appliquée)'}</span><span>{money(totals.vat)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--border, #ddd)', marginTop: 6, paddingTop: 12, fontSize: 18 }}><strong>Total {vatEnabled ? 'TTC' : 'à payer'}</strong><strong>{money(totals.total)}</strong></div>
    </div>
    {msg && <div className={isError ? 'form-error' : 'form-success'} style={{ marginTop: 12 }} role="status">{msg}</div>}
    <div className="page-actions" style={{ marginTop: 18 }}><button className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : type === 'quote' ? 'Enregistrer le devis' : 'Enregistrer le document'}</button></div>
  </form>;
}
