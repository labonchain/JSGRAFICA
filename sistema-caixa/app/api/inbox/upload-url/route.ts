export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 093: rota leve que não recebe o arquivo em si, só autoriza o
// upload — o navegador sobe o arquivo direto pro Supabase Storage usando a
// signed URL gerada aqui, sem passar pelo corpo de uma função da Vercel
// (limite de ~4,5MB de payload serverless, estourava com foto de celular
// real). O token da signed URL já autoriza o upload nesse path específico,
// mesmo com a chave anônima do navegador — não precisa de policy de INSERT
// nova no bucket.
export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'fileName obrigatório' }, { status: 400 });

    const ext  = String(fileName).split('.').pop() || 'bin';
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('inbox-media')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return NextResponse.json({ path: data.path, token: data.token });
  } catch (error) {
    console.error('[UPLOAD-URL]', error);
    return NextResponse.json({ error: 'Erro ao gerar URL de upload' }, { status: 500 });
  }
}
