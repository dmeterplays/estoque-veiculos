import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  let body: { email: string; password: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: 'Email e senha são obrigatórios' },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) {
    console.error('login error:', error.status, error.message, JSON.stringify(error));
    return NextResponse.json(
      { error: 'Email ou senha incorretos' },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
