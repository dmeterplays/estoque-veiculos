import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import AdminClient from './admin-client';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'platform_admin') {
    redirect('/dashboard');
  }

  return <AdminClient />;
}
