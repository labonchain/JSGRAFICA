export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { chamarGemini, contextoDataHoraAtual } from '@/lib/gemini';
import { buscarContextoConversa } from '@/lib/inboxContexto';

// Sugestão de resposta (demanda 048) — só preenche o campo de texto do
// Inbox pro atendente revisar/editar. Nunca envia nada sozinha.
export async function POST(req: NextRequest) {
  try {
    const { phone, nomeCliente } = await req.json();
    if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

    const { linhasConversa, pedido } = await buscarContextoConversa(phone);
    if (linhasConversa.length === 0) {
      return NextResponse.json({ error: 'Sem histórico de mensagens pra essa conversa ainda' }, { status: 422 });
    }

    const contextoPedido = pedido
      ? `\nPedido vinculado a esta conversa: ${pedido.servico_nome ?? 'serviço não especificado'}${pedido.quantidade ? `, quantidade ${pedido.quantidade}` : ''}${pedido.valor_final ? `, valor R$ ${Number(pedido.valor_final).toFixed(2)}` : ''}, status: ${pedido.status}.`
      : '';

    const prompt = `${contextoDataHoraAtual()}

Você é um atendente da JS Gráfica, uma gráfica rápida no Ibura, Recife (PE). Sugira uma resposta curta, natural, educada e em português informal (mas profissional) para a conversa de WhatsApp abaixo — o atendente vai revisar e editar antes de enviar.

Regras importantes:
- Não invente preços, prazos ou informações que não estejam explícitas na conversa ou no pedido vinculado abaixo.
- Se precisar de uma informação que não está disponível, seja genérico e ofereça confirmar em seguida.
- Responda só com o texto da mensagem sugerida — sem aspas, sem explicações, sem "Sugestão:".

Cliente: ${nomeCliente || 'não identificado'}${contextoPedido}

Conversa (mais recente por último):
${linhasConversa.join('\n')}`;

    const sugestao = await chamarGemini(prompt);
    return NextResponse.json({ sugestao });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao gerar sugestão';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
