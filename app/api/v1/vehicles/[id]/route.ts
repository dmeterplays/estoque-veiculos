import { authenticateStore } from '@/lib/auth';
import { errorResponse, jsonResponse } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateStore(request);
  if (!authResult.store) {
  return errorResponse(authResult.error ?? 'Unauthorized', authResult.status);
  }
  const store = authResult.store;

  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return errorResponse('Invalid vehicle id', 400);
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'own';

  let query = supabaseAdmin
    .from('vehicles_full')
    .select('*')
    .eq('id', id)
    .eq('active', true);

  if (scope === 'own') {
    query = query.eq('store_id', store.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return errorResponse('Query failed', 500, error.message);
  }

  if (!data) {
    return errorResponse('Vehicle not found', 404);
  }

  return jsonResponse(data);
}