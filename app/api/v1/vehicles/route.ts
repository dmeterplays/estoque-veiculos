import { authenticateStore } from '@/lib/auth';
import { errorResponse, jsonResponse } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase';
import { VehicleFiltersSchema } from '@/lib/vehicle-filters';

export async function GET(request: Request) {
  // 1. Autenticar
  const authResult = await authenticateStore(request);
  if (!authResult.store) {
  return errorResponse(authResult.error ?? 'Unauthorized', authResult.status);
  }
  const store = authResult.store;

  // 2. Parsear filtros
  const { searchParams } = new URL(request.url);
  const rawFilters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key === 'api_key') return;
    rawFilters[key] = value;
  });

  const parsed = VehicleFiltersSchema.safeParse(rawFilters);
  if (!parsed.success) {
    return errorResponse('Invalid filters', 422, parsed.error.issues);
  }
  const f = parsed.data;

  const scope = searchParams.get('scope') || 'own';

  // 3. Montar query
  let query = supabaseAdmin
    .from('vehicles_full')
    .select('*', { count: 'exact' })
    .eq('active', true);

  if (scope === 'own') {
    query = query.eq('store_id', store.id);
  } else if (scope === 'all') {
    if (f.store_id) query = query.eq('store_id', f.store_id);
  } else {
    return errorResponse('Invalid scope. Use "own" or "all"', 400);
  }

  if (f.brand) query = query.ilike('brand', f.brand);
  if (f.model) query = query.ilike('model', `%${f.model}%`);
  if (f.fuel) query = query.eq('fuel', f.fuel.toUpperCase());
  if (f.transmission) query = query.eq('transmission', f.transmission.toUpperCase());
  if (f.condition) query = query.eq('condition', f.condition);
  if (f.city) query = query.ilike('city', f.city);
  if (f.state) query = query.eq('state', f.state.toUpperCase());

  if (f.price_min !== undefined) query = query.gte('price', f.price_min);
  if (f.price_max !== undefined) query = query.lte('price', f.price_max);
  if (f.year_min !== undefined) query = query.gte('year_model', f.year_min);
  if (f.year_max !== undefined) query = query.lte('year_model', f.year_max);
  if (f.km_min !== undefined) query = query.gte('km', f.km_min);
  if (f.km_max !== undefined) query = query.lte('km', f.km_max);

  if (f.q) {
    const term = f.q.trim();
    query = query.or(
      `brand.ilike.%${term}%,model.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  query = query
    .order(f.order_by, { ascending: f.order_dir === 'asc' })
    .range(f.offset, f.offset + f.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return errorResponse('Query failed', 500, error.message);
  }

  return jsonResponse({
    scope,
    authenticated_store: { id: store.id, name: store.name },
    total: count ?? 0,
    limit: f.limit,
    offset: f.offset,
    count: data?.length ?? 0,
    vehicles: data ?? [],
  });
}