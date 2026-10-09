'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function SaleActions({ saleId, companyId, validated }: { saleId: string; companyId: string; validated: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function validate() {
    setBusy(true); setMessage('');
    const supabase = createBrowserClient(url, key);
    const { error } = await supabase.rpc('validate_sale', { p_sale_id: saleId });
    setMessage(error ? error.message : 'Document de prestation validé.');
    setBusy(false);
    if (!error) window.location.reload();
  }
  return <button className="btn btn-primary" disabled={busy || validated} onClick={validate}>{busy ? 'Validation…' : validated ? 'Validée' : 'Valider le document'}</button>;
}
