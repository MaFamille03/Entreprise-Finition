import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/queries';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUserContext();
  if (!user) redirect('/login');
  if (profile?.company_id) redirect('/dashboard');
  return <div className="auth-page"><div className="auth-card"><div className="logo">Finition<span>ERP</span></div><h1>Configurer votre entreprise</h1><p className="muted">Cette étape initialise la société, la caisse, le compte bancaire et les modes de paiement.</p><OnboardingForm /></div></div>;
}
