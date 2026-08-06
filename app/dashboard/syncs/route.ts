import { createClient } from '@/lib/supabase-server';
import { jsonResponse } from '@/lib/http';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ syncs: [] });

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .single();

  if (!profile?.store_id) return jsonResponse({ syncs: [] });

  const { data, error } = await supabase
    .from('inventory_syncs')
    .select(
      'id, received_at, vehicles_received, vehicles_created, vehicles_updated, vehicles_deactivated, status'
    )
    .eq('store_id', profile.store_id)
    .order('received_at', { ascending: false })
    .limit(20);

  if (error) return jsonResponse({ syncs: [], error: error.message });

  return jsonResponse({ syncs: data ?? [] });
}