import { authenticateStore } from '@/lib/auth';
import { errorResponse, jsonResponse } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase';
import { InventorySyncSchema, type VehicleInput } from '@/types/vehicle';

export async function POST(request: Request) {
  // 1. Autenticar loja
  const authResult = await authenticateStore(request);
  if (!authResult.store) {
  return errorResponse(authResult.error ?? 'Unauthorized', authResult.status);
  }
  const store = authResult.store;

  // 2. Parsear e validar JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = InventorySyncSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 422, parsed.error.issues);
  }

  const { vehicles } = parsed.data;

  // 3. Registrar início do sync
  const syncLog = {
    store_id: store.id,
    vehicles_received: vehicles.length,
    vehicles_created: 0,
    vehicles_updated: 0,
    vehicles_deactivated: 0,
    status: 'success' as 'success' | 'partial' | 'failed',
    errors: [] as Array<{ index: number; message: string }>,
  };

  // 4. Buscar veículos existentes da loja
  const { data: existingVehicles, error: fetchError } = await supabaseAdmin
    .from('vehicles')
    .select('id, external_id')
    .eq('store_id', store.id)
    .eq('active', true);

  if (fetchError) {
    return errorResponse('Failed to fetch existing vehicles', 500, fetchError.message);
  }

  const existingByExternalId = new Map(
    (existingVehicles || [])
      .filter((v) => v.external_id)
      .map((v) => [v.external_id, v.id])
  );

  const receivedExternalIds = new Set<string>();

  // 5. Processar cada veículo (upsert)
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    try {
      const result = await upsertVehicle(store.id, v, existingByExternalId);
      if (result.created) syncLog.vehicles_created++;
      else syncLog.vehicles_updated++;
      if (v.external_id) receivedExternalIds.add(v.external_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncLog.errors.push({ index: i, message: msg });
      syncLog.status = 'partial';
    }
  }

  // 6. Desativar veículos que sumiram
  const allHaveExternalId = vehicles.every((v) => v.external_id);
  if (allHaveExternalId && vehicles.length > 0) {
    const toDeactivate = (existingVehicles || [])
      .filter((v) => v.external_id && !receivedExternalIds.has(v.external_id))
      .map((v) => v.id);

    if (toDeactivate.length > 0) {
      const { error: deactivateError } = await supabaseAdmin
        .from('vehicles')
        .update({ active: false })
        .in('id', toDeactivate);

      if (deactivateError) {
        syncLog.errors.push({
          index: -1,
          message: `Failed to deactivate: ${deactivateError.message}`,
        });
        syncLog.status = 'partial';
      } else {
        syncLog.vehicles_deactivated = toDeactivate.length;
      }
    }
  }

  // 7. Salvar log
  if (syncLog.errors.length === vehicles.length && vehicles.length > 0) {
    syncLog.status = 'failed';
  }

  await supabaseAdmin.from('inventory_syncs').insert({
    store_id: store.id,
    vehicles_received: syncLog.vehicles_received,
    vehicles_created: syncLog.vehicles_created,
    vehicles_updated: syncLog.vehicles_updated,
    vehicles_deactivated: syncLog.vehicles_deactivated,
    status: syncLog.status,
    errors: syncLog.errors.length > 0 ? syncLog.errors : null,
  });

  return jsonResponse({
    store_id: store.id,
    store_name: store.name,
    summary: {
      received: syncLog.vehicles_received,
      created: syncLog.vehicles_created,
      updated: syncLog.vehicles_updated,
      deactivated: syncLog.vehicles_deactivated,
    },
    status: syncLog.status,
    errors: syncLog.errors.length > 0 ? syncLog.errors : undefined,
  });
}

async function upsertVehicle(
  storeId: string,
  v: VehicleInput,
  existingByExternalId: Map<string, string>
): Promise<{ created: boolean; vehicleId: string }> {
  const vehicleData = {
    store_id: storeId,
    external_id: v.external_id || null,
    fuel: v.fuel,
    transmission: v.transmission,
    city: v.city,
    state: v.state,
    brand: v.brand,
    model: v.model,
    image: v.image || null,
    video_url: v.videoUrl || null,
    video_order: v.videoOrder,
    preparation_release_date: v.preparationReleaseDate || null,
    description: v.description || null,
    price: v.price,
    year_manufacture: v.year_manufacture,
    year_model: v.year_model,
    km: v.km,
    condition: v.condition,
    plate_end: v.plate_end || null,
    active: true,
  };

  const existingId = v.external_id ? existingByExternalId.get(v.external_id) : undefined;

  let vehicleId: string;
  let created: boolean;

  if (existingId) {
    const { error } = await supabaseAdmin
      .from('vehicles')
      .update(vehicleData)
      .eq('id', existingId);
    if (error) throw new Error(`Update failed: ${error.message}`);
    vehicleId = existingId;
    created = false;
  } else {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert(vehicleData)
      .select('id')
      .single();
    if (error) throw new Error(`Insert failed: ${error.message}`);
    vehicleId = data.id;
    created = true;
  }

  await supabaseAdmin.from('vehicle_colors').delete().eq('vehicle_id', vehicleId);

  if (v.colors && v.colors.length > 0) {
    const colorsToInsert = v.colors.map((c) => ({
      vehicle_id: vehicleId,
      name: c.name,
      quantity: c.quantity,
    }));
    const { error } = await supabaseAdmin.from('vehicle_colors').insert(colorsToInsert);
    if (error) throw new Error(`Colors insert failed: ${error.message}`);
  }

  return { created, vehicleId };
}