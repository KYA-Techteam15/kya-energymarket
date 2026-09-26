import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/account/DashboardPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/espace/')({
  head: () => ({ meta: [{ title: `${m.me_dashboard()} — KYA-EnergyMarket` }] }),
  component: DashboardPage,
});
