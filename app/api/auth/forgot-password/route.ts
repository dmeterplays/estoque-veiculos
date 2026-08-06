import { createClient } from '@/lib/supabase-server';
import { errorResponse, jsonResponse } from '@/lib/http';

export async function POST(request: Request) {
  const supabase = await createClient();

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return errorResponse('Email é obrigatório', 400);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://estoque.viralstudios.com.br';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  // Sempre retorna ok para não revelar se o e-mail existe
  if (error) {
    console.error('resetPasswordForEmail error:', error.message);
  }

  return jsonResponse({
    ok: true,
    message: 'Se este e-mail estiver cadastrado, enviaremos um link de redefinição.',
  });
}