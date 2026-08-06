import { createClient } from '@/lib/supabase-server';
import { errorResponse, jsonResponse } from '@/lib/http';
import { z } from 'zod';

const VehicleUpdateSchema = z.object({
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year_manufacture: z.number().int().min(1900).max(2100).optional(),
  year_model: z.number().int().min(1900).max(2100).optional(),
  km: z.number().int().min(0).optional(),
  price: z.number().positive().optional(),
  fuel: z.string().min(1).optional(),
  transmission: z.string().min(1).optional(),
  condition: z.enum(['new', 'used']).optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2).optional(),
  image: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().url().nullable().optional()),
  description: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().nullable().optional()),
  active: z.boolean().optional(),
  colors: z
    .array(z.object({ name: z.string(), quantity: z.number().int().positive() }))
    .optional(),
  images: z.array(z.string().url()).optional(),
  media: z
    .array(z.object({ url: z.string().url(), kind: z.enum(['image', 'video']).default('image') }))
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // confirma que o veículo pertence à loja
  const { data: vehicle, error: getErr } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', id)
    .eq('store_id', profile.store_id)
    .single();
  if (getErr || !vehicle) return errorResponse('Veículo não encontrado', 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = VehicleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Dados inválidos', 422, parsed.error.issues);
  }

  const d = parsed.data;
  const fields: Record<string, unknown> = {};

  if (d.brand !== undefined) fields.brand = d.brand;
  if (d.model !== undefined) fields.model = d.model;
  if (d.year_manufacture !== undefined) fields.year_manufacture = d.year_manufacture;
  if (d.year_model !== undefined) fields.year_model = d.year_model;
  if (d.km !== undefined) fields.km = d.km;
  if (d.price !== undefined) fields.price = d.price;
  if (d.fuel !== undefined) fields.fuel = d.fuel;
  if (d.transmission !== undefined) fields.transmission = d.transmission;
  if (d.condition !== undefined) fields.condition = d.condition;
  if (d.city !== undefined) fields.city = d.city;
  if (d.state !== undefined) fields.state = d.state;
  if (d.image !== undefined) fields.image = d.image;
  if (d.description !== undefined) fields.description = d.description;
  if (d.active !== undefined) {
    fields.active = d.active;
    if (!d.active) fields.inactive_reason = 'manual';
  }

  // quando há media/imagens novas, define a primeira imagem como cover
  const hasMedia = d.media !== undefined || d.images !== undefined;
  if (hasMedia) {
    const media = [
      ...(d.media ?? []),
      ...(d.images ?? []).map((url) => ({ url, kind: 'image' as const })),
    ];
    const seen = new Set<string>();
    const unique = media.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
    const firstImage = unique.find((m) => m.kind === 'image')?.url ?? null;
    if (unique.length > 0) {
      fields.image = firstImage;
    }
  }

  const { error: updErr } = await supabase
    .from('vehicles')
    .update(fields)
    .eq('id', id);
  if (updErr) return errorResponse('Erro ao atualizar veículo', 500, updErr.message);

  // atualiza cores (substitui todas)
  if (d.colors !== undefined) {
    await supabase.from('vehicle_colors').delete().eq('vehicle_id', id);
    if (d.colors.length > 0) {
      await supabase.from('vehicle_colors').insert(
        d.colors.map((c) => ({ vehicle_id: id, name: c.name, quantity: c.quantity }))
      );
    }
  }

  // atualiza mídia (substitui todas)
  if (hasMedia) {
    await supabase.from('vehicle_images').delete().eq('vehicle_id', id);
    const media = [
      ...(d.media ?? []),
      ...(d.images ?? []).map((url) => ({ url, kind: 'image' as const })),
    ];
    const seen = new Set<string>();
    const unique = media.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
    if (unique.length > 0) {
      await supabase.from('vehicle_images').insert(
        unique.map((m, i) => ({
          vehicle_id: id,
          url: m.url,
          kind: m.kind,
          position: i,
          is_main: i === 0 && m.kind === 'image',
        }))
      );
    }
  }

  return jsonResponse({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', id)
    .eq('store_id', profile.store_id)
    .single();
  if (!vehicle) return errorResponse('Veículo não encontrado', 404);

  // vehicle_images tem on delete cascade; vehicle_colors não, então remove manualmente
  await supabase.from('vehicle_colors').delete().eq('vehicle_id', id);

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);
  if (error) return errorResponse('Erro ao excluir veículo', 500, error.message);

  return jsonResponse({ ok: true });
}