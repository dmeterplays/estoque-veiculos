import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, store_id, role, full_name')
    .eq('id', user.id)
    .single();

  // Se é admin da plataforma, vai pro painel admin
  if (profile?.role === 'platform_admin') {
    redirect('/admin');
  }

  if (!profile?.store_id) {
    redirect('/login');
  }

  // Busca dados da loja
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, api_key, city, state, whatsapp, plan, active')
    .eq('id', profile.store_id)
    .single();

  return (
    <DashboardClient
      userEmail={user.email ?? ''}
      fullName={profile.full_name}
      store={store}
    />
  );
}
