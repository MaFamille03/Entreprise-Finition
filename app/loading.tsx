export default function Loading() {
  return (
    <main className="loading-page" aria-live="polite" aria-busy="true">
      <div className="loading-spinner" />
      <p>Chargement…</p>
    </main>
  );
}
