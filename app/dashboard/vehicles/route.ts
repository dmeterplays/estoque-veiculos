import { createClient } from '@/lib/supabase-server';
import { errorResponse, jsonResponse } from '@/lib/http';
import { z } from 'zod';

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
  image: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  colors: z
    .array(z.object({ name: z.string(), quantity: z.number().int().positive() }))
    .default([]),
  images: z.array(z.string().url()).default([]),
  media: z
    .array(z.object({ url: z.string().url(), kind: z.enum(['image', 'video']).default('image') }))
    .default([]),
});

export async function POST(request: Request) {
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

  const media: { url: string; kind: 'image' | 'video' }[] = [
    ...d.media,
    ...d.images.map((url) => ({ url, kind: 'image' as const })),
  ];
  // remove duplicatas
  const seen = new Set<string>();
  const uniqueMedia = media.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));

  const firstImage = uniqueMedia.find((m) => m.kind === 'image')?.url ?? d.image ?? null;

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .insert({
      store_id: profile.store_id,
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
      description: d.description || null,
    })
    .select('id')
    .single();

  if (error) return errorResponse('Erro ao cadastrar veículo', 500, error.message);

  if (d.colors.length > 0) {
    await supabase.from('vehicle_colors').insert(
      d.colors.map((c) => ({
        vehicle_id: vehicle.id,
        name: c.name,
        quantity: c.quantity,
      }))
    );
  }

  if (uniqueMedia.length > 0) {
    await supabase.from('vehicle_images').insert(
      uniqueMedia.map((m, i) => ({
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
