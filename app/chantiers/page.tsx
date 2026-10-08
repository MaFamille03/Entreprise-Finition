import Link from 'next/link';
import { Building2, Plus, Search, ArrowUpRight } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { createClient } from '@/lib/supabase-server';
import { formatMoney, labelStatus } from '@/lib/format';

function statusClass(status: string) {
  if (status === 'completed') return 'badge badge-green';
  if (status === 'cancelled' || status === 'suspended') return 'badge badge-red';
  if (status === 'in_progress') return 'badge badge-blue';
  return 'badge badge-orange';
}

export default async function ChantiersListPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? '').trim().toLowerCase();
  const selectedStatus = params.status ?? 'all';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  if (!profile?.company_id) return null;
  const companyId = profile.company_id;

  const [{ data: projects }, { data: summaries }] = await Promise.all([
    supabase.from('projects')
      .select('id,reference,name,address,status,start_date,expected_end_date,budget,contacts(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase.from('project_financial_summary').select('*').eq('company_id', companyId),
  ]);

  const financial = new Map((summaries ?? []).map((item: any) => [item.project_id, item]));
  const filtered = (projects ?? []).filter((project: any) => {
    const client = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts;
    const haystack = `${project.reference} ${project.name} ${project.address ?? ''} ${client?.name ?? ''}`.toLowerCase();
    return (!query || haystack.includes(query)) && (selectedStatus === 'all' || project.status === selectedStatus);
  });

  const totalBudget = (projects ?? []).reduce((sum, project: any) => sum + Number(project.budget ?? 0), 0);
  const totalRevenue = (summaries ?? []).reduce((sum: number, item: any) => sum + Number(item.revenue ?? 0), 0);
  const totalCost = (summaries ?? []).reduce((sum: number, item: any) => sum + Number(item.cost ?? 0), 0);
  const totalMargin = (summaries ?? []).reduce((sum: number, item: any) => sum + Number(item.margin ?? 0), 0);
  const count = (status: string) => (projects ?? []).filter((project: any) => project.status === status).length;

  const statuses = [
    ['all', 'Tous'], ['preparation', 'À préparer'], ['in_progress', 'En cours'],
    ['suspended', 'Suspendus'], ['completed', 'Terminés'], ['cancelled', 'Annulés'],
  ];

  return <Page
    title="Chantiers"
    description="Pilotez les projets, leurs coûts, leur facturation et leur rentabilité."
    action={<Link className="btn btn-primary" href="/chantiers/nouveau"><Plus size={16} /> Nouveau chantier</Link>}
  >
    <div className="chantier-stats">
      <div className="card"><div className="stat-label">Tous les chantiers</div><div className="stat-value">{projects?.length ?? 0}</div></div>
      <div className="card"><div className="stat-label">En cours</div><div className="stat-value">{count('in_progress')}</div></div>
      <div className="card"><div className="stat-label">À préparer</div><div className="stat-value">{count('preparation')}</div></div>
      <div className="card"><div className="stat-label">Terminés</div><div className="stat-value">{count('completed')}</div></div>
      <div className="card"><div className="stat-label">Montant des marchés</div><div className="stat-value">{formatMoney(totalBudget)}</div></div>
      <div className="card"><div className="stat-label">Facturé</div><div className="stat-value">{formatMoney(totalRevenue)}</div></div>
      <div className="card"><div className="stat-label">Coûts</div><div className="stat-value">{formatMoney(totalCost)}</div></div>
      <div className="card"><div className="stat-label">Marge</div><div className="stat-value">{formatMoney(totalMargin)}</div></div>
    </div>

    <div className="chantier-toolbar card">
      <form className="chantier-search" method="get">
        <Search size={17} />
        <input name="q" defaultValue={params.q ?? ''} placeholder="Rechercher un chantier, client, référence..." />
        {selectedStatus !== 'all' && <input type="hidden" name="status" value={selectedStatus} />}
      </form>
      <div className="chantier-filters">
        {statuses.map(([value, label]) => <Link key={value} className={`filter-pill ${selectedStatus === value ? 'active' : ''}`} href={value === 'all' ? '/chantiers' : `/chantiers?status=${value}${params.q ? `&q=${encodeURIComponent(params.q)}` : ''}`}>{label}</Link>)}
      </div>
    </div>

    <div className="card chantier-table-wrap">
      <div className="section-title"><div><h3>Liste des chantiers</h3><span className="muted">{filtered.length} chantier{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span></div></div>
      <div className="chantier-table">
        <div className="chantier-row chantier-head"><span>Référence</span><span>Chantier</span><span>Client</span><span>Dates</span><span>Marché</span><span>Facturé</span><span>Coût</span><span>Marge</span><span>État</span><span /></div>
        {filtered.map((project: any) => {
          const client = Array.isArray(project.contacts) ? project.contacts[0] : project.contacts;
          const summary: any = financial.get(project.id) ?? {};
          return <Link className="chantier-row" href={`/chantiers/${project.id}`} key={project.id}>
            <span className="project-reference-cell">{project.reference}</span>
            <span className="project-name-cell"><span className="project-icon"><Building2 size={17} /></span><span><strong>{project.name}</strong><small>{project.address || 'Adresse non renseignée'}</small></span></span>
            <span>{client?.name || '—'}</span>
            <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR') : '—'}<small>{project.expected_end_date ? ` → ${new Date(project.expected_end_date).toLocaleDateString('fr-FR')}` : ''}</small></span>
            <span>{formatMoney(project.budget)}</span>
            <span>{formatMoney(summary.revenue)}</span>
            <span>{formatMoney(summary.cost)}</span>
            <span>{formatMoney(summary.margin)}</span>
            <span><span className={statusClass(project.status)}>{labelStatus(project.status)}</span></span>
            <span className="row-arrow"><ArrowUpRight size={16} /></span>
          </Link>;
        })}
        {!filtered.length && <div className="empty-state">Aucun chantier ne correspond à votre recherche.</div>}
      </div>
    </div>
  </Page>;
}
