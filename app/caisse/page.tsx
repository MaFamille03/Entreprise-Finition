import { Page } from '@/components/ui/page';
import { getTreasuryData } from '@/lib/queries';
import { TreasuryManager } from './treasury-manager';

export default async function Caisse() {
  const data = await getTreasuryData();
  return (
    <Page title="Caisse & trésorerie" description="Journal de trésorerie par compte, soldes initiaux, encaissements, décaissements et virements.">
      <TreasuryManager accounts={(data?.accounts ?? []) as any[]} transactions={(data?.transactions ?? []) as any[]} />
    </Page>
  );
}
