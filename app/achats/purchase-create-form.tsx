'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Contact = { id: string; name: string };
type Project = { id: string; name: string; reference: string };
type Material = { id: string; name: string; purchase_price: number; unit: string };

export function PurchaseCreateForm({ companyId, suppliers, projects, materials }: { companyId: string; suppliers: Contact[]; projects: Project[]; materials: Material[] }) {
  const [supplierId, setSupplierId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [materialId, setMaterialId] = useState('');
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
      setMsg('Renseignez la nature de la dépense ou de l’achat.');
      setIsError(true);
      return;
    }
    if (!Number.isFinite(Number(qty)) || Number(qty) <= 0 || !Number.isFinite(Number(price)) || Number(price) < 0) {
      setMsg('Vérifiez la quantité et le coût unitaire.');
      setIsError(true);
      return;
    }

    setBusy(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.rpc('create_purchase_document', {
      p_company_id: companyId,
      p_supplier_id: supplierId || null,
      p_project_id: projectId || null,
      p_issue_date: new Date().toISOString().slice(0, 10),
      p_due_date: null,
      p_discount: 0,
      p_notes: null,
      p_lines: [{ item_id: materialId || null, description: description.trim(), quantity: Number(qty), unit_price: Number(price), discount: 0, vat_rate: Number(vatRate) }],
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      setIsError(true);
      return;
    }
    setMsg('Dépense / achat enregistré.');
    window.location.reload();
  }

  return (
    <form onSubmit={submit} className="card form-grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>Enregistrer un achat ou un coût de chantier</h2>
        <p className="muted" style={{ margin: 0 }}>Saisissez une prestation externe, une location, du transport, des matériaux ou des consommables, sans devoir créer un article au préalable.</p>
      </div>
      <div>
        <label className="label" htmlFor="purchase-supplier">Fournisseur / prestataire</label>
        <select id="purchase-supplier" className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">Non renseigné</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="purchase-project">Chantier concerné</label>
        <select id="purchase-project" className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Frais généraux / aucun chantier</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.reference} — {project.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="purchase-material">Lier à un matériau suivi (facultatif)</label>
        <select id="purchase-material" className="input" value={materialId} onChange={(event) => {
          const selectedId = event.target.value;
          const selectedMaterial = materials.find((material) => material.id === selectedId);
          setMaterialId(selectedId);
          if (selectedMaterial) {
            setDescription(selectedMaterial.name);
            setPrice(String(selectedMaterial.purchase_price || 0));
          }
        }}>
          <option value="">Aucune liaison — frais ou prestation</option>
          {materials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label className="label" htmlFor="purchase-description">Nature de l’achat ou de la dépense *</label>
        <input id="purchase-description" className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex. Achat de peinture, location d’échafaudage, sous-traitance, transport…" required />
      </div>
      <div>
        <label className="label" htmlFor="purchase-quantity">Quantité / unités</label>
        <input id="purchase-quantity" className="input" type="number" min="0.001" step="0.001" value={qty} onChange={(event) => setQty(event.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="purchase-unit-cost">Coût unitaire HT (FCFA)</label>
        <input id="purchase-unit-cost" className="input" type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="purchase-vat">TVA</label>
        <select id="purchase-vat" className="input" value={vatRate} onChange={(event) => setVatRate(event.target.value)}><option value="18">18 %</option><option value="0">0 %</option></select>
      </div>
      <div className="muted" style={{ alignSelf: 'end', fontSize: 12 }}>Montant HT : {(Math.max(0, Number(qty) || 0) * Math.max(0, Number(price) || 0)).toLocaleString('fr-FR')} FCFA</div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer l’achat'}</button>
        {msg && <p className={isError ? 'error' : 'notice'} role="status" style={{ marginTop: 10 }}>{msg}</p>}
      </div>
    </form>
  );
}
