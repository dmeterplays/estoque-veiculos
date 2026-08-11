import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { errorResponse, jsonResponse } from '@/lib/http';
import { parseUploadedFile, parseRowToVehicle } from '@/lib/importer';

export async function POST(request: Request) {
  // 1. Autenticação (sessão do painel)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse('Não autenticado', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .single();
  if (!profile?.store_id) return errorResponse('Loja não vinculada', 403);

  // 2. Ler arquivo multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('FormData inválido', 400);
  }
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return errorResponse('Nenhum arquivo enviado', 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  // 3. Parsear (JSON/CSV/XLSX) e mapear colunas
  const { rows, errors: parseErrors } = parseUploadedFile(buffer, file.name);
  if (parseErrors.length > 0) return errorResponse(parseErrors.join('; '), 422);

  const imported: Record<string, unknown>[] = [];
  const rowErrors: { index: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const { vehicle, errors } = parseRowToVehicle(row, i);
    if (errors.length > 0) {
      errors.forEach((msg) => rowErrors.push({ index: i, message: msg }));
      return;
    }
    imported.push(vehicle);
  });

  if (imported.length === 0) {
    return jsonResponse(
      {
        ok: false,
        summary: { received: rows.length, created: 0, updated: 0, deactivated: 0 },
        status: 'failed',
        errors: rowErrors,
        message: 'Nenhum veículo válido encontrado. Verifique as colunas da planilha.',
      },
      200
    );
  }

  // 4. Upsert
  const { data: existingVehicles, error: fetchError } = await supabaseAdmin
    .from('vehicles')
    .select('id, external_id')
    .eq('store_id', profile.store_id)
    .eq('active', true);

  if (fetchError) return errorResponse('Falha ao buscar veículos', 500, fetchError.message);

  const existingByExternalId = new Map<string, string>();
  (existingVehicles ?? [])
    .filter((v) => v.external_id)
    .forEach((v) => existingByExternalId.set(v.external_id, v.id));

  const syncLog = {
    store_id: profile.store_id,
    vehicles_received: imported.length,
    vehicles_created: 0,
    vehicles_updated: 0,
    vehicles_deactivated: 0,
    status: 'success' as 'success' | 'partial' | 'failed',
    errors: [] as { index: number; message: string }[],
  };

  const receivedExternalIds = new Set<string>();

  for (let i = 0; i < imported.length; i++) {
    const v = imported[i];
    try {
      const result = await upsertVehicle(profile.store_id, v, existingByExternalId);
      if (result.created) syncLog.vehicles_created++;
      else syncLog.vehicles_updated++;
      if (v.external_id) receivedExternalIds.add(String(v.external_id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncLog.errors.push({ index: i, message: msg });
      syncLog.status = 'partial';
    }
  }

  // 5. Desativar veículos que sumiram (somente se todos têm external_id)
  const allHaveExternalId = imported.every((v) => v.external_id);
  if (allHaveExternalId && imported.length > 0) {
    const toDeactivate = (existingVehicles ?? [])
      .filter((v) => v.external_id && !receivedExternalIds.has(v.external_id))
      .map((v) => v.id);
    if (toDeactivate.length > 0) {
      const { error: deactErr } = await supabaseAdmin
        .from('vehicles')
        .update({ active: false })
        .in('id', toDeactivate);
      if (!deactErr) syncLog.vehicles_deactivated = toDeactivate.length;
    }
  }

  if (syncLog.errors.length === imported.length && imported.length > 0) {
    syncLog.status = 'failed';
  }

  await supabaseAdmin.from('inventory_syncs').insert({
    store_id: profile.store_id,
    vehicles_received: syncLog.vehicles_received,
    vehicles_created: syncLog.vehicles_created,
    vehicles_updated: syncLog.vehicles_updated,
    vehicles_deactivated: syncLog.vehicles_deactivated,
    status: syncLog.status,
    errors: syncLog.errors.length > 0 ? syncLog.errors : null,
  });

  const allErrors = [...rowErrors, ...syncLog.errors];

  return jsonResponse({
    ok: true,
    summary: {
      received: syncLog.vehicles_received,
      created: syncLog.vehicles_created,
      updated: syncLog.vehicles_updated,
      deactivated: syncLog.vehicles_deactivated,
    },
    status: syncLog.status,
    errors: allErrors.length > 0 ? allErrors : undefined,
    message: allErrors.length > 0 ? 'Importação concluída com alguns erros' : undefined,
  });
}

async function upsertVehicle(
  storeId: string,
  v: Record<string, unknown>,
  existingByExternalId: Map<string, string>
): Promise<{ created: boolean; vehicleId: string }> {
  const vehicleData = {
    store_id: storeId,
    external_id: v.external_id ? String(v.external_id) : null,
    fuel: String(v.fuel ?? 'FLEX'),
    transmission: String(v.transmission ?? 'MANUAL'),
    city: String(v.city ?? ''),
    state: String(v.state ?? ''),
    brand: String(v.brand ?? ''),
    model: String(v.model ?? ''),
    image: v.image ? String(v.image) : null,
    video_url: v.video_url ? String(v.video_url) : null,
    description: v.description ? String(v.description) : null,
    price: Number(v.price ?? 0),
    year_manufacture: Number(v.year_manufacture ?? new Date().getFullYear()),
    year_model: Number(v.year_model ?? new Date().getFullYear()),
    km: Number(v.km ?? 0),
    condition: v.condition === 'new' ? 'new' : 'used',
    plate_end: v.plate_end ? String(v.plate_end) : null,
    active: true,
  };

  const existingId = v.external_id ? existingByExternalId.get(String(v.external_id)) : undefined;

  let vehicleId: string;
  let created: boolean;

  if (existingId) {
    const { error } = await supabaseAdmin.from('vehicles').update(vehicleData).eq('id', existingId);
    if (error) throw new Error(`Falha ao atualizar: ${error.message}`);
    vehicleId = existingId;
    created = false;
  } else {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert(vehicleData)
      .select('id')
      .single();
    if (error) throw new Error(`Falha ao inserir: ${error.message}`);
    vehicleId = data.id;
    created = true;
  }

  await supabaseAdmin.from('vehicle_colors').delete().eq('vehicle_id', vehicleId);

  const colors = Array.isArray(v.colors)
    ? (v.colors as { name: string; quantity: number }[]).filter(
        (c) => c && typeof c.name === 'string' && c.name.length > 0
      )
    : [];
  if (colors.length > 0) {
    await supabaseAdmin.from('vehicle_colors').insert(
      colors.map((c) => ({ vehicle_id: vehicleId, name: c.name, quantity: c.quantity }))
    );
  }

  return { created, vehicleId };
}