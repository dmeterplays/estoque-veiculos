import { createClient } from '@/lib/supabase-server';
import { jsonResponse } from '@/lib/http';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ vehicles: [] });

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .single();

  if (!profile?.store_id) return jsonResponse({ vehicles: [] });

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('store_id', profile.store_id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) return jsonResponse({ vehicles: [], error: error.message });

  // busca imagens/vídeos de todos os veículos da loja de uma vez
  const { data: images, error: imgErr } = await supabase
    .from('vehicle_images')
    .select('vehicle_id, url, kind, position, is_main')
    .in('vehicle_id', (data ?? []).map((v) => v.id))
    .order('position', { ascending: true });

  if (imgErr) return jsonResponse({ vehicles: data ?? [], error: imgErr.message });

  const byVehicle = new Map<string, typeof images>();
  for (const img of images ?? []) {
    const arr = byVehicle.get(img.vehicle_id) ?? [];
    arr.push(img);
    byVehicle.set(img.vehicle_id, arr);
  }

  const vehicles = (data ?? []).map((v) => ({
    ...v,
    media: byVehicle.get(v.id) ?? [],
  }));

  return jsonResponse({ vehicles });
}
