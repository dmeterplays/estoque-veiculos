import { createClient } from '@/lib/supabase-server';
import { errorResponse, jsonResponse } from '@/lib/http';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm'];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

const PUBLIC_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://estoque.viralstudios.com.br';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse('Não autenticado', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .single();

  if (!profile?.store_id) return errorResponse('Loja não vinculada', 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('FormData inválido', 400);
  }

  const file = formData.get('file') as File | null;
  if (!file) return errorResponse('Nenhum arquivo enviado', 400);
  if (file.size === 0) return errorResponse('Arquivo vazio', 400);
  if (file.size > MAX_SIZE) return errorResponse('Arquivo muito grande (máx 15MB)', 400);

  const mime = file.type;
  const isVideo = ALLOWED_VIDEO.includes(mime);
  if (!ALLOWED_IMAGE.includes(mime) && !isVideo) {
    return errorResponse('Formato não permitido (imagens: jpg, png, webp, gif. vídeos: mp4, webm)', 415);
  }

  const ext = isVideo ? (mime === 'video/webm' ? 'webm' : 'mp4') : mime.split('/')[1];
  const filename = `${randomUUID()}.${ext}`;

  // Salva direto na pasta de upload (volume montado em /app/uploads)
  const uploadDir = path.join(process.cwd(), 'uploads');
  try {
    await mkdir(uploadDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buf);
  } catch (err) {
    return errorResponse('Erro ao salvar arquivo', 500, err instanceof Error ? err.message : undefined);
  }

  const url = `${PUBLIC_BASE}/uploads/${filename}`;

  return jsonResponse({ ok: true, url, kind: isVideo ? 'video' : 'image' }, 201);
}