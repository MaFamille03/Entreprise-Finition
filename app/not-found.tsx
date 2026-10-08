import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="logo">Finition<span>ERP</span></div>
        <h1>Page introuvable</h1>
        <p className="muted">Cette page n’existe pas ou n’est plus disponible.</p>
        <Link className="btn btn-primary full" href="/dashboard">Retour au tableau de bord</Link>
      </section>
    </main>
  );
}
