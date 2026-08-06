import { errorResponse, jsonResponse } from '@/lib/http';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const RegisterSchema = z.object({
  store_name: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  whatsapp: z.string().optional().nullable(),
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Dados inválidos', 422, parsed.error.issues);
  }

  const data = parsed.data;

  // 1. Cria a loja
  const { data: store, error: storeError } = await supabaseAdmin
    .from('stores')
    .insert({
      name: data.store_name,
      city: data.city,
      state: data.state,
      whatsapp: data.whatsapp || null,
      plan: 'free',
    })
    .select('id')
    .single();

  if (storeError) {
    return errorResponse('Erro ao criar loja', 500, storeError.message);
  }

  // 2. Cria o usuário (via admin API)
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name, store_id: store.id },
  });

  if (userError) {
    // rollback da loja
    await supabaseAdmin.from('stores').delete().eq('id', store.id);
    return errorResponse('Erro ao criar usuário', 500, userError.message);
  }

  // 3. Vincula o profile à loja
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ store_id: store.id, role: 'store_owner', full_name: data.full_name })
    .eq('id', user.user.id);

  if (profileError) {
    return errorResponse('Erro ao vincular perfil', 500, profileError.message);
  }

  return jsonResponse({ ok: true, store_id: store.id }, 201);
}
