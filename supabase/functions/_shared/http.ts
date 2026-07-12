// Shared HTTP helpers — JSON responses, a consistent error envelope, CORS (Backend §4).

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

/** Thrown anywhere in a function; the handler maps it to an error envelope + status. */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown): Response {
  const env: ErrorEnvelope = { error: { code, message, ...(details !== undefined ? { details } : {}) } };
  return new Response(JSON.stringify(env), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

/** Wrap a handler so thrown AppErrors (and anything else) become clean error envelopes. */
export function withErrorEnvelope(handler: (req: Request) => Response | Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof AppError) return errorResponse(e.code, e.message, e.status, e.details);
      return errorResponse('internal_error', e instanceof Error ? e.message : String(e), 500);
    }
  };
}
