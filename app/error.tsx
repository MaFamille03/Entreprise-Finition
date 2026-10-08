'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="auth-page">
      <section className="auth-card" role="alert">
        <div className="logo">Finition<span>ERP</span></div>
        <h1>Une erreur est survenue</h1>
        <p className="muted">La page n’a pas pu être chargée correctement.</p>
        <button className="btn btn-primary full" onClick={() => reset()}>Réessayer</button>
      </section>
    </main>
  );
}
