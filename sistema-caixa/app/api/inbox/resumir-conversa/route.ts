export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { chamarGemini, contextoDataHoraAtual } from '@/lib/gemini';
import { buscarContextoConversa } from '@/lib/inboxContexto';

// Resumo de conversa longa (demanda 048) — nota de apoio interna pro
// atendente, não é mensagem e nunca é enviada ao cliente.
export async function POST(req: NextRequest) {
  try {
    const { phone, nomeCliente } = await req.json();
    if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

    const { linhasConversa } = await buscarContextoConversa(phone);
    if (linhasConversa.length === 0) {
      return NextResponse.json({ error: 'Sem histórico de mensagens pra essa conversa ainda' }, { status: 422 });
    }

    const prompt = `${contextoDataHoraAtual()}

Resuma a conversa de WhatsApp abaixo, entre a JS Gráfica (gráfica rápida no Ibura, Recife) e o cliente ${nomeCliente || 'não identificado'}, em no máximo 3 linhas curtas, em português. É uma nota interna pro atendente entender rápido onde a conversa parou — não é uma mensagem pro cliente. Responda só com o resumo, sem título.

Conversa (mais recente por último):
${linhasConversa.join('\n')}`;

    const resumo = await chamarGemini(prompt);
    return NextResponse.json({ resumo });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao gerar resumo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
