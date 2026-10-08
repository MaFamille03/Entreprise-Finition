import { Page } from '@/components/ui/page';
import { createClient } from '@/lib/supabase-server';
import ProjectCreateForm from '../project-create-form';

export default async function NouveauChantierPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.user.id).single();
  if (!profile?.company_id) return null;
  const { data: clients } = await supabase.from('contacts').select('id,name').eq('company_id', profile.company_id).eq('type', 'client').eq('is_active', true).order('name');
  return <Page title="Nouveau chantier" description="Créez le dossier de travail qui centralisera les opérations du projet."><ProjectCreateForm companyId={profile.company_id} clients={clients ?? []} /></Page>;
}
