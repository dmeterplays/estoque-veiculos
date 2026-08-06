import { createClient } from '@/lib/supabase-server';
import { errorResponse, jsonResponse } from '@/lib/http';

export async function POST(request: Request) {
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const password = body.password;
  if (!password || password.length < 6) {
    return errorResponse('A senha deve ter no mínimo 6 caracteres', 400);
  }

  // O Supabase já trocou a sessão para o usuário ao validar o link do e-mail,
  // então updateUser atualiza a senha do usuário atual.
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return errorResponse('Não foi possível redefinir a senha', 400, error.message);
  }

  return jsonResponse({ ok: true });
}