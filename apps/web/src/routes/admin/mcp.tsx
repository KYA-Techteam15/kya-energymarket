import { createFileRoute, redirect } from '@tanstack/react-router';
import { McpAdminPage } from '@/features/mcp/McpAdminPage';
import { getMcpAdmin } from '@/features/mcp/server';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/mcp')({
  loader: async () => {
    const admin = await getMcpAdmin();
    if (!admin) throw redirect({ to: '/admin' });
    return admin;
  },
  head: () => ({ meta: [{ title: `${m.admin_mcp()} — KYA-EnergyMarket` }] }),
  component: McpAdminRoute,
});

function McpAdminRoute() {
  return <McpAdminPage admin={Route.useLoaderData()} />;
}
