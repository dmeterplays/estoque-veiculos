import { supabaseAdmin } from './supabase';

export type Store = {
  id: string;
  name: string;
  active: boolean;
  plan: string;
};

export type AuthResult = {
  store: Store | null;
  error: string | null;
  status: number;
};

/**
 * Extrai a API key do header Authorization ou do query param api_key.
 */
function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }

  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey) return xApiKey.trim();

  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get('api_key');
  if (queryKey) return queryKey.trim();

  return null;
}

/**
 * Autentica uma loja pela API key.
 * Sempre retorna { store, error, status }.
 * Se store for null, use error + status pra responder.
 */
export async function authenticateStore(request: Request): Promise<AuthResult> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      store: null,
      error:
        'Missing API key. Use header "Authorization: Bearer <key>" or "x-api-key: <key>"',
      status: 401,
    };
  }

  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, active, plan')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (error) {
    return { store: null, error: 'Authentication error', status: 500 };
  }

  if (!data) {
    return { store: null, error: 'Invalid API key', status: 401 };
  }

  if (!data.active) {
    return { store: null, error: 'Store is inactive', status: 403 };
  }

  return { store: data as Store, error: null, status: 200 };
}