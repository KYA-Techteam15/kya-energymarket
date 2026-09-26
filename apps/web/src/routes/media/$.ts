import { MEDIA_KEY } from '@kya-em/domain';
import { createFileRoute } from '@tanstack/react-router';
import { runtime } from '@/shared/server/runtime.server';

// Images de la médiathèque (spec 004, FR-005) : clé unique par téléversement, donc cache immuable.
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat ?? '';
        if (!MEDIA_KEY.test(key)) return new Response('Introuvable', { status: 404 });
        const object = await runtime().media.get(key);
        if (!object) return new Response('Introuvable', { status: 404 });
        return new Response(new Blob([object.body as Uint8Array<ArrayBuffer>]), {
          headers: {
            'content-type': object.contentType,
            'cache-control': 'public, max-age=31536000, immutable',
            'x-content-type-options': 'nosniff',
          },
        });
      },
    },
  },
});
