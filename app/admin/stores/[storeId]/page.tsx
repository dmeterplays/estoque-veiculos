import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import AdminStoreClient from './admin-store-client';

export default async function AdminStorePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

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
  if (!profile || profile.role !== 'platform_admin') redirect('/dashboard');

  const { data: store, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, city, state, plan, active, created_at')
    .eq('id', storeId)
    .single();

  if (error || !store) notFound();

  return (
    <AdminStoreClient
      store={{ ...store, created_at: store.created_at?.toString() ?? '' }}
    />
  );
}