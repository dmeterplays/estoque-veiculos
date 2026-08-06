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

  return jsonResponse({ vehicles: data ?? [] });
}
