export function formatMoney(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export const statusLabels: Record<string, string> = {
  draft: 'Brouillon', validated: 'Validé', partially_paid: 'Partiellement payé', paid: 'Payé', cancelled: 'Annulé',
  ordered: 'Commandé', partially_received: 'Partiellement reçu', received: 'Réceptionné',
  prospect: 'Prospection', quote: 'Devis', pending: 'En attente', accepted: 'Accepté', preparation: 'Préparation', in_progress: 'En cours', suspended: 'Suspendu', completed: 'Terminé',
};

export function labelStatus(value: string | null | undefined) { return value ? statusLabels[value] ?? value : '—'; }
