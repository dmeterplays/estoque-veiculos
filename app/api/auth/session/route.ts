import { createClient } from '@/lib/supabase-server';
import { jsonResponse } from '@/lib/http';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse({ user: null }, 200);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, store_id, role, full_name')
    .eq('id', user.id)
    .single();

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
}
