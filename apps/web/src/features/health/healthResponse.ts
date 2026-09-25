import { checkHealth } from '@kya-em/domain';
import { sql } from 'drizzle-orm';
import { runtime } from '@/shared/server/runtime';

export async function healthResponse(): Promise<Response> {
  const { env, database } = runtime();
  const report = await checkHealth({
    version: env.APP_VERSION,
    environment: env.APP_ENV,
    database: database
      ? async () => {
          await database.db.execute(sql`select 1`);
        }
      : undefined,
  });
  return Response.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}
