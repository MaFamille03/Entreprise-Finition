'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { formatDate, formatMoney } from '@/lib/format';

type Account = {
  id: string; name: string; type: 'cash' | 'bank' | 'mobile_money' | 'other';
  opening_balance: number | string; opening_balance_date: string; current_balance: number | string;
};
type Transaction = {
  id: string; account_id: string; amount: number | string; type: string; transaction_date: string;
  label: string; reference: string | null; observation: string | null; created_at?: string;
};
type Props = { accounts: Account[]; transactions: Transaction[] };
type LedgerRow = { key: string; reference: string; date: string; label: string; incoming: number; outgoing: number; balance: number; observation: string; initial?: boolean };

const accountTypeLabel: Record<Account['type'], string> = {
  cash: 'Caisse', bank: 'Banque', mobile_money: 'Mobile money', other: 'Autre compte',
};
const incomingTypes = new Set(['income', 'customer_payment', 'transfer_in']);
const outgoingTypes = new Set(['expense', 'supplier_payment', 'refund', 'transfer_out']);
const amount = (v: number | string | null | undefined) => Number(v ?? 0);

export function TreasuryManager({ accounts, transactions }: Props) {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeForm, setActiveForm] = useState<'movement' | 'transfer' | 'account' | 'opening'>('movement');
  const [transferSource, setTransferSource] = useState(accounts[0]?.id ?? '');
  const [transferDestination, setTransferDestination] = useState(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const account = accounts.find((a) => a.id === selectedAccount);
  const totalBalance = accounts.reduce((sum, a) => sum + amount(a.current_balance), 0);
  const totalIncoming = transactions.filter((t) => ['income', 'customer_payment'].includes(t.type)).reduce((sum, t) => sum + amount(t.amount), 0);
  const totalOutgoing = transactions.filter((t) => ['expense', 'supplier_payment', 'refund'].includes(t.type)).reduce((sum, t) => sum + amount(t.amount), 0);

  const ledger = useMemo(() => {
    if (!account) return [] as LedgerRow[];
    const movements = transactions
      .filter((t) => t.account_id === account.id && t.transaction_date >= account.opening_balance_date)
      .slice()
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    let runningBalance = amount(account.opening_balance);
    const rows: LedgerRow[] = [{
      key: `opening-${account.id}`, reference: 'SI', date: account.opening_balance_date,
      label: 'Solde initial', incoming: 0, outgoing: 0, balance: runningBalance,
      observation: 'Solde à l’ouverture du compte', initial: true,
    }];
    for (const t of movements) {
      const isIncoming = incomingTypes.has(t.type);
      const isOutgoing = outgoingTypes.has(t.type);
      const incoming = isIncoming ? amount(t.amount) : 0;
      const outgoing = isOutgoing ? amount(t.amount) : 0;
      // Le type « other » est conservé dans le journal, mais ne modifie pas le solde automatiquement.
      runningBalance += incoming - outgoing;
      rows.push({
        key: t.id, reference: t.reference || '—', date: t.transaction_date,
        label: t.label, incoming, outgoing, balance: runningBalance,
        observation: t.observation || '',
      });
    }
    if (!fromDate && !toDate) return rows;
    const inRange = rows.filter((r) => !r.initial && (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate));
    if (!fromDate) return [rows[0], ...inRange];
    const prior = [...rows].reverse().find((r) => r.date < fromDate);
    const opening = {
      key: `carry-${account.id}-${fromDate}`, reference: 'REPORT', date: fromDate,
      label: 'Solde reporté au début de la période', incoming: 0, outgoing: 0,
      balance: prior?.balance ?? amount(account.opening_balance),
      observation: 'Solde calculé à partir des mouvements antérieurs', initial: true,
    };
    return [opening, ...inRange];
  }, [account, transactions, fromDate, toDate]);

  async function getCompanyId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Session expirée. Reconnectez-vous.');
    const { data: profile, error } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (error || !profile?.company_id) throw new Error('Entreprise introuvable pour cet utilisateur.');
    return profile.company_id as string;
  }

  async function submitAction(e: FormEvent<HTMLFormElement>, action: 'movement' | 'transfer' | 'account' | 'opening') {
    e.preventDefault();
    setMessage(''); setErrorMessage('');
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        const companyId = await getCompanyId();
        let result: { error: { message: string } | null };
        if (action === 'movement') {
          result = await supabase.rpc('record_treasury_movement', {
            p_company_id: companyId,
            p_account_id: String(data.get('account_id')),
            p_type: String(data.get('movement_type')),
            p_amount: Number(data.get('amount')),
            p_label: String(data.get('label')).trim(),
            p_transaction_date: String(data.get('date') || new Date().toISOString().slice(0, 10)),
            p_reference: String(data.get('reference') || '').trim() || null,
            p_observation: String(data.get('observation') || '').trim() || null,
          });
        } else if (action === 'transfer') {
          result = await supabase.rpc('record_treasury_transfer', {
            p_company_id: companyId,
            p_source_account_id: String(data.get('source_account_id')),
            p_destination_account_id: String(data.get('destination_account_id')),
            p_amount: Number(data.get('amount')),
            p_transaction_date: String(data.get('date') || new Date().toISOString().slice(0, 10)),
            p_reference: String(data.get('reference') || '').trim() || null,
            p_observation: String(data.get('observation') || '').trim() || null,
          });
        } else if (action === 'account') {
          result = await supabase.rpc('create_financial_account', {
            p_company_id: companyId,
            p_name: String(data.get('name')).trim(),
            p_type: String(data.get('account_type')),
            p_opening_balance: Number(data.get('opening_balance') || 0),
            p_opening_balance_date: String(data.get('opening_date') || new Date().toISOString().slice(0, 10)),
          });
        } else {
          result = await supabase.rpc('update_financial_account_opening_balance', {
            p_company_id: companyId,
            p_account_id: String(data.get('account_id')),
            p_opening_balance: Number(data.get('opening_balance')),
            p_opening_balance_date: String(data.get('opening_date')),
          });
        }
        if (result.error) throw new Error(result.error.message);
        setMessage(action === 'movement' ? 'Mouvement enregistré.' : action === 'transfer' ? 'Virement enregistré dans les deux comptes.' : action === 'account' ? 'Compte créé avec son solde initial.' : 'Solde initial mis à jour et solde courant recalculé.');
        form.reset();
        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  }

  return <div className="treasury-layout">
    <div className="grid-cards treasury-summary">
      <div className="card"><div className="stat-label">Trésorerie totale</div><div className="stat-value">{formatMoney(totalBalance)}</div><div className="muted">Solde cumulé des comptes actifs</div></div>
      <div className="card"><div className="stat-label">Entrées enregistrées</div><div className="stat-value treasury-positive">{formatMoney(totalIncoming)}</div><div className="muted">Tous comptes confondus</div></div>
      <div className="card"><div className="stat-label">Sorties enregistrées</div><div className="stat-value treasury-negative">{formatMoney(totalOutgoing)}</div><div className="muted">Tous comptes confondus</div></div>
      <div className="card"><div className="stat-label">Comptes actifs</div><div className="stat-value">{accounts.length}</div><div className="muted">Caisse, banque, mobile money…</div></div>
    </div>

    <section className="card treasury-accounts">
      <div className="section-heading"><div><h3>Mes comptes</h3><p className="muted">Chaque compte possède son propre journal et son propre solde courant.</p></div></div>
      {accounts.length ? <div className="treasury-account-grid">{accounts.map((a) => <button type="button" key={a.id} className={`treasury-account ${selectedAccount === a.id ? 'selected' : ''}`} onClick={() => setSelectedAccount(a.id)}>
        <span className="treasury-account-icon">{a.type === 'cash' ? '₣' : a.type === 'bank' ? '▤' : a.type === 'mobile_money' ? '▣' : '◈'}</span>
        <span className="treasury-account-name">{a.name}</span><span className="muted">{accountTypeLabel[a.type]}</span><strong>{formatMoney(a.current_balance)}</strong>
      </button>)}</div> : <p className="muted">Aucun compte actif. Créez d’abord un compte pour commencer la trésorerie.</p>}
    </section>

    <section className="card treasury-actions">
      <div className="section-heading"><div><h3>Opérations de trésorerie</h3><p className="muted">Enregistrez une entrée, une sortie, un virement interne ou un nouveau compte.</p></div></div>
      <div className="treasury-tabs" role="tablist" aria-label="Type d’opération">
        <button type="button" className={activeForm === 'movement' ? 'active' : ''} onClick={() => { setActiveForm('movement'); setMessage(''); setErrorMessage(''); }}>Entrée / sortie</button>
        <button type="button" className={activeForm === 'transfer' ? 'active' : ''} onClick={() => { setActiveForm('transfer'); setMessage(''); setErrorMessage(''); }}>Virement entre comptes</button>
        <button type="button" className={activeForm === 'account' ? 'active' : ''} onClick={() => { setActiveForm('account'); setMessage(''); setErrorMessage(''); }}>Nouveau compte</button>
        <button type="button" className={activeForm === 'opening' ? 'active' : ''} onClick={() => { setActiveForm('opening'); setMessage(''); setErrorMessage(''); }}>Solde initial</button>
      </div>
      {activeForm === 'movement' && <form className="form-grid treasury-form" onSubmit={(e) => submitAction(e, 'movement')}>
        <label>Compte<select name="account_id" required value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {accountTypeLabel[a.type]}</option>)}</select></label>
        <label>Type de mouvement<select name="movement_type" required defaultValue="income"><option value="income">Entrée d’argent</option><option value="expense">Sortie d’argent</option></select></label>
        <label>Date<input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label>Montant (FCFA)<input type="number" name="amount" min="1" step="1" required placeholder="Ex. 150000" /></label>
        <label className="treasury-wide">Désignation<input name="label" required maxLength={180} placeholder="Ex. Règlement client, achat de ciment, frais de transport…" /></label>
        <label>N° BL / Référence<input name="reference" maxLength={100} placeholder="Ex. BL-2026-001" /></label>
        <label>Observation<input name="observation" maxLength={500} placeholder="Précision facultative" /></label>
        <div className="treasury-wide"><button className="btn btn-primary" disabled={busy || !accounts.length}>{busy ? 'Enregistrement…' : 'Enregistrer le mouvement'}</button></div>
      </form>}
      {activeForm === 'transfer' && <form className="form-grid treasury-form" onSubmit={(e) => submitAction(e, 'transfer')}>
        <label>Compte source<select name="source_account_id" required value={transferSource} onChange={(e) => { const nextSource = e.target.value; setTransferSource(nextSource); if (nextSource === transferDestination) setTransferDestination(accounts.find((a) => a.id !== nextSource)?.id ?? ''); }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Compte destination<select name="destination_account_id" required value={transferDestination} onChange={(e) => setTransferDestination(e.target.value)}>{accounts.filter((a) => a.id !== transferSource).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Date<input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label>Montant (FCFA)<input type="number" name="amount" min="1" step="1" required placeholder="Ex. 50000" /></label>
        <label>N° BL / Référence<input name="reference" maxLength={100} placeholder="Référence du virement" /></label>
        <label>Observation<input name="observation" maxLength={500} placeholder="Motif du virement" /></label>
        <p className="muted treasury-wide">Un virement génère automatiquement une sortie sur le compte source et une entrée sur le compte destination. Il ne modifie pas la trésorerie totale.</p>
        <div className="treasury-wide"><button className="btn btn-primary" disabled={busy || accounts.length < 2}>{busy ? 'Enregistrement…' : 'Enregistrer le virement'}</button></div>
      </form>}
      {activeForm === 'opening' && <form key={`${selectedAccount}-${account?.opening_balance}-${account?.opening_balance_date}`} className="form-grid treasury-form" onSubmit={(e) => submitAction(e, 'opening')}>
        <label>Compte<select name="account_id" required value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Nouveau solde initial (FCFA)<input type="number" name="opening_balance" required step="1" defaultValue={account?.opening_balance ?? 0} /></label>
        <label>Date du solde initial<input type="date" name="opening_date" required defaultValue={account?.opening_balance_date ?? new Date().toISOString().slice(0, 10)} /></label>
        <p className="muted treasury-wide">À utiliser pour corriger le solde de départ d’un compte existant. Le solde courant sera recalculé avec les mouvements datés du jour d’ouverture ou après.</p>
        <div className="treasury-wide"><button className="btn btn-primary" disabled={busy || !accounts.length}>{busy ? 'Mise à jour…' : 'Mettre à jour le solde initial'}</button></div>
      </form>}
      {activeForm === 'account' && <form className="form-grid treasury-form" onSubmit={(e) => submitAction(e, 'account')}>
        <label>Nom du compte<input name="name" required maxLength={100} placeholder="Ex. Banque SGCI, Caisse principale, Orange Money" /></label>
        <label>Catégorie<select name="account_type" required defaultValue="cash"><option value="cash">Caisse</option><option value="bank">Banque</option><option value="mobile_money">Mobile money</option><option value="other">Autre</option></select></label>
        <label>Solde initial (FCFA)<input type="number" name="opening_balance" required step="1" defaultValue="0" /></label>
        <label>Date du solde initial<input type="date" name="opening_date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <p className="muted treasury-wide">Le solde initial sera affiché comme première ligne « SI » du journal. Renseignez le solde réel du compte à cette date.</p>
        <div className="treasury-wide"><button className="btn btn-primary" disabled={busy}>{busy ? 'Création…' : 'Créer le compte'}</button></div>
      </form>}
      {message && <p className="treasury-message success-message" role="status">{message}</p>}
      {errorMessage && <p className="treasury-message error-message" role="alert">{errorMessage}</p>}
    </section>

    <section className="card treasury-ledger">
      <div className="section-heading"><div><h3>Journal de trésorerie</h3><p className="muted">{account ? `Compte : ${account.name}` : 'Sélectionnez un compte'} · Le solde est recalculé ligne par ligne.</p></div></div>
      <div className="treasury-filters">
        <label>Compte<select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}><option value="">Choisir un compte</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Du<input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} /></label>
        <label>Au<input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} /></label>
        <button type="button" className="btn btn-outline" onClick={() => { setFromDate(''); setToDate(''); }}>Réinitialiser les dates</button>
      </div>
      <div className="table-wrap treasury-table-wrap"><table className="data-table treasury-table"><thead><tr><th>N° BL / Réf.</th><th>Date</th><th>Désignation</th><th>Entrée</th><th>Sortie</th><th>Solde</th><th>Observation</th></tr></thead><tbody>
        {ledger.map((r) => <tr key={r.key} className={r.initial ? 'treasury-opening-row' : ''}><td>{r.reference}</td><td>{formatDate(r.date)}</td><td>{r.label}</td><td className="treasury-positive">{r.incoming ? formatMoney(r.incoming) : '—'}</td><td className="treasury-negative">{r.outgoing ? formatMoney(r.outgoing) : '—'}</td><td className="treasury-balance">{formatMoney(r.balance)}</td><td className="treasury-observation">{r.observation || '—'}</td></tr>)}
        {!ledger.length && <tr><td colSpan={7} className="treasury-empty">{account ? 'Aucun mouvement pour cette période.' : 'Choisissez un compte pour afficher son journal.'}</td></tr>}
      </tbody></table></div>
      <div className="treasury-ledger-footer"><span>{ledger.length} ligne(s) affichée(s)</span>{account && <strong>Solde courant du compte : {formatMoney(account.current_balance)}</strong>}</div>
    </section>
  </div>;
}
