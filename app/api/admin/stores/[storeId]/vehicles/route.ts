import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { errorResponse, jsonResponse } from '@/lib/http';
import { z } from 'zod';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado', status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'platform_admin') {
    return { error: 'Acesso restrito a administradores', status: 403 };
  }
  return { error: null };
}

const VehicleCreateSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  year_manufacture: z.number().int().min(1900).max(2100),
  year_model: z.number().int().min(1900).max(2100),
  km: z.number().int().min(0),
  price: z.number().positive(),
  fuel: z.string().min(1),
  transmission: z.string().min(1),
  condition: z.enum(['new', 'used']).default('used'),
  city: z.string().min(1),
  state: z.string().length(2),
  image: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  colors: z.array(z.object({ name: z.string().min(1), quantity: z.number().int().positive() })).default([]),
  images: z.array(z.string().url()).default([]),
  media: z.array(z.object({ url: z.string().url(), kind: z.enum(['image', 'video']) })).default([]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return errorResponse(auth.error, auth.status);
  const { storeId } = await params;

  const { data: vehicles, error } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) return errorResponse('Erro ao listar veículos', 500, error.message);

  const ids = (vehicles ?? []).map((v) => v.id);
  const mediaBy: Record<string, { url: string; kind: string; position: number; is_main: boolean }[]> = {};
  if (ids.length > 0) {
    const { data: imgs } = await supabaseAdmin
      .from('vehicle_images')
      .select('*')
      .in('vehicle_id', ids)
      .order('position', { ascending: true });
    imgs?.forEach((m) => {
      mediaBy[m.vehicle_id] = mediaBy[m.vehicle_id] ?? [];
      mediaBy[m.vehicle_id].push(m);
    });
  }

  const result = (vehicles ?? []).map((v) => ({
    ...v,
    colors: v.colors ?? [],
    media: mediaBy[v.id] ?? [],
  }));

  return jsonResponse({ vehicles: result });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return errorResponse(auth.error, auth.status);
  const { storeId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = VehicleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Dados inválidos', 422, parsed.error.issues);
  }

  const d = parsed.data;
  const media = [
    ...(d.media ?? []),
    ...(d.images ?? []).map((url) => ({ url, kind: 'image' as const })),
  ];
  const seen = new Set<string>();
  const unique = media.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
  const firstImage = unique.find((m) => m.kind === 'image')?.url ?? d.image ?? null;

  const { data: vehicle, error } = await supabaseAdmin
    .from('vehicles')
    .insert({
      store_id: storeId,
      brand: d.brand,
      model: d.model,
      year_manufacture: d.year_manufacture,
      year_model: d.year_model,
      km: d.km,
      price: d.price,
      fuel: d.fuel,
      transmission: d.transmission,
      condition: d.condition,
      city: d.city,
      state: d.state,
      image: firstImage,
      description: d.description,
    })
    .select('id')
    .single();
  if (error) return errorResponse('Erro ao criar veículo', 500, error.message);

  if (d.colors.length > 0) {
    await supabaseAdmin.from('vehicle_colors').insert(
      d.colors.map((c) => ({ vehicle_id: vehicle.id, name: c.name, quantity: c.quantity }))
    );
  }
  if (unique.length > 0) {
    await supabaseAdmin.from('vehicle_images').insert(
      unique.map((m, i) => ({
        vehicle_id: vehicle.id,
        url: m.url,
        kind: m.kind,
        position: i,
        is_main: i === 0 && m.kind === 'image',
      }))
    );
  }

  return jsonResponse({ ok: true, id: vehicle.id }, 201);
}