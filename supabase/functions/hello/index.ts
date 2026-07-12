// `hello` — auth-mode-aware skeleton function (Backend §4). Echoes the resolved auth mode so a
// user JWT vs the service key vs anonymous are distinguishable. Real functions follow this shape.
import { createContext } from '../_shared/context.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';

Deno.serve(
  withErrorEnvelope((req) => {
    const ctx = createContext(req);
    return jsonResponse({ hello: 'palmly', mode: ctx.mode, userId: ctx.userId });
  }),
);
