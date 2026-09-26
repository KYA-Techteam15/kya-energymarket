import { createFileRoute } from '@tanstack/react-router';
import { AdminHomePage } from '@/features/admin/AdminHomePage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/')({
  head: () => ({ meta: [{ title: `${m.me_admin()} — KYA-EnergyMarket` }] }),
  component: AdminHomePage,
});
