import { createClient } from '@/lib/supabase-server';
import { errorResponse, jsonResponse } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase';
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

  return { user, error: null };
}

const CreateStoreSchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']).default('free'),
  owner_email: z.string().email(),
  owner_name: z.string().min(2),
  owner_password: z.string().min(6).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { data: stores, error } = await supabaseAdmin
    .from('stores')
    .select('*, users:profiles(id, full_name)')
    .order('created_at', { ascending: false });

  if (error) return errorResponse('Erro ao buscar lojas', 500, error.message);

  return jsonResponse({ stores: stores ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return errorResponse(auth.error, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = CreateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Dados inválidos', 422, parsed.error.issues);
  }

  const d = parsed.data;

  // 1. Cria loja
  const { data: store, error: storeError } = await supabaseAdmin
    .from('stores')
    .insert({
      name: d.name,
      cnpj: d.cnpj || null,
      city: d.city || null,
      state: d.state || null,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      plan: d.plan,
    })
    .select('id, name, api_key')
    .single();

  if (storeError) return errorResponse('Erro ao criar loja', 500, storeError.message);

  // 2. Cria usuário (conta do dono da loja)
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: d.owner_email,
    password: d.owner_password || undefined,
    email_confirm: true,
    user_metadata: { full_name: d.owner_name, store_id: store.id },
  });

  if (userError) {
    await supabaseAdmin.from('stores').delete().eq('id', store.id);
    return errorResponse('Erro ao criar usuário', 500, userError.message);
  }

  // 3. Vincula profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ store_id: store.id, role: 'store_owner', full_name: d.owner_name })
    .eq('id', user.user.id);

  if (profileError) {
    return errorResponse('Erro ao vincular perfil', 500, profileError.message);
  }

  return jsonResponse(
    {
      ok: true,
      store: {
        id: store.id,
        name: store.name,
        api_key: store.api_key,
      },
    },
    201
  );
}
