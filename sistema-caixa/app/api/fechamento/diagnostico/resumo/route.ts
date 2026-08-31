export const dynamic = 'force-dynamic';

// ── Demanda 152 — Diagnóstico de Fechamento, Camada C/4: NARRATIVA ──
// POST gera (via Gemini, mesma lib/gemini.ts das features manuais da 048) um
// resumo em português do fechamento do dia, a partir dos dados da Camada A
// (149) + sinais da Camada B (150). O resumo é salvo em jsgrafica_fechamento
// (linha GERAL do dia) pra Camada D exibir/editar:
// - regerar sobrescreve `resumo_ia`, NUNCA `resumo_editado` (edição do Admin
//   é sagrada);
// - falha do Gemini devolve erro claro e não grava nada — o diagnóstico
//   (GET 149/150) e o fechamento em si nunca dependem disto;
// - dia sem fechamento geral ainda: gera e devolve o texto, mas não salva
//   (criar linha marcaria o dia como "fechado" pro resto do sistema).
// O resumo só NARRA — nenhuma correção automática.

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa, parseDiaCaixa } from '@/lib/supabase';
import { supabaseAdmin, ehFechamentoGeral } from '@/lib/supabase-admin';
import { montarDiagnosticoDia, type DiagnosticoDia } from '@/lib/diagnostico';
import { chamarGemini } from '@/lib/gemini';

function dinheiro(v: number | null | undefined): string {
  return `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
}

// Prompt compacto: só o que é relevante pra narrar — totais, o que foi
// digitado no fechamento, sinais da Camada B — nunca o dump bruto de pedidos
// (o modelo não precisa de 100 linhas pra explicar 1 divergência).
function montarPrompt(d: DiagnosticoDia): string {
  const fg = d.fechamentoGeral;
  const porForma = new Map<string, { qtd: number; total: number }>();
  for (const p of d.pedidosEntregues) {
    const k = p.formaPagamento || 'Não informada';
    const cur = porForma.get(k) ?? { qtd: 0, total: 0 };
    cur.qtd += 1; cur.total = Math.round((cur.total + p.valorFinal) * 100) / 100;
    porForma.set(k, cur);
  }
  const formasTxt = [...porForma.entries()]
    .map(([f, v]) => `- ${f}: ${v.qtd} pedido(s), ${dinheiro(v.total)}`)
    .join('\n');

  const sinaisTxt = d.sinais.length === 0
    ? '(nenhum sinal detectado pelas regras automáticas)'
    : d.sinais.map(s => `- [${s.severidade}] ${s.descricao}`).join('\n');

  const fechamentoTxt = fg
    ? `Fechamento geral gravado: físico contado ${dinheiro(fg.total_fisico)} (dinheiro ${dinheiro(fg.dinheiro)}, moedas ${dinheiro(fg.moedas)}, contas/bancos ${dinheiro(fg.bancos)}), esperado ${dinheiro(fg.saldo_acumulado)}, DIVERGÊNCIA ${dinheiro(fg.divergencia)}.`
    : 'O dia ainda NÃO tem fechamento geral gravado.';

  const operadoresTxt = d.fechamentosOperadores
    .map(o => {
      if (!o.fechou) return `- ${o.operador}: não fechou a própria gaveta`;
      const det = d.fechamentosOperadoresDetalhe.find(f => f.operador === o.operador);
      const divTxt = det ? `, contado ${dinheiro(det.totalFisico)} contra esperado ${dinheiro(det.esperado)} — divergência ${dinheiro(det.divergencia)}` : '';
      return `- ${o.operador}: fechou (dinheiro ${dinheiro(o.dinheiro)}, moedas ${dinheiro(o.moedas)}${divTxt})`;
    })
    .join('\n');

  return `Você escreve o resumo diário de fechamento de caixa de uma gráfica rápida em Recife (JS Gráfica). Leitor: o dono (Edvam), que conhece o próprio negócio — zero necessidade de explicar termos.

REGRAS DO TEXTO (obrigatórias):
- Português do Brasil, tom direto e seco, sem saudação, sem "como IA", sem floreio.
- 1 a 3 parágrafos curtos, texto corrido (sem títulos, sem listas, sem markdown).
- Cite os números reais (R$) dos dados abaixo. NUNCA invente número ou causa.
- Se os dados NÃO sustentarem uma explicação pra divergência, diga isso com todas as letras (ex.: "os dados disponíveis não explicam a diferença") — é PROIBIDO forçar hipótese fraca. Só aponte causa se um sinal ou número apontar diretamente pra ela.
- Sinais de severidade "info" são contexto, não problema.

DADOS DO DIA ${d.dataDia}:
Entradas: ${dinheiro(d.totais.totalEntradas)} (${d.pedidosEntregues.length} pedidos entregues). Saídas: ${dinheiro(d.totais.totalSaidas)} (${d.saidas.length} lançamentos). Resultado do dia: ${dinheiro(d.totais.resultadoDia)}. Saldo anterior: ${dinheiro(d.totais.saldoAnterior)}. Saldo esperado acumulado: ${dinheiro(d.totais.saldoAcumulado)}.
Recebido na conta Mercado Pago (real): ${d.saldoMercadoPago == null ? 'indisponível (integração falhou)' : dinheiro(d.saldoMercadoPago)}.
${fechamentoTxt}
Gavetas por operador:
${operadoresTxt}
Pedidos por forma de pagamento:
${formasTxt}
Sinais detectados pelas regras automáticas (Camada B):
${sinaisTxt}

Escreva o resumo agora.`;
}

export async function POST(req: NextRequest) {
  const dataDia = req.nextUrl.searchParams.get('data') || formatarDiaCaixa();
  if (!parseDiaCaixa(dataDia)) {
    return NextResponse.json({ error: 'Data inválida — use DD-MM-AA (ex.: 07-07-26)' }, { status: 400 });
  }

  // 1. Coleta (149/150) — se ISTO falhar é problema de dados, não do Gemini.
  let diagnostico: DiagnosticoDia;
  try {
    diagnostico = await montarDiagnosticoDia(dataDia);
  } catch (error) {
    console.error('[152] Falha na coleta do diagnóstico', error);
    return NextResponse.json({ error: 'Erro ao coletar os dados do dia' }, { status: 500 });
  }

  // 2. Gemini — falha aqui NUNCA grava nada nem afeta diagnóstico/fechamento.
  let resumo: string;
  try {
    resumo = await chamarGemini(montarPrompt(diagnostico), { maxOutputTokens: 1000, temperature: 0.3 });
  } catch (error) {
    console.error('[152] Falha ao gerar resumo no Gemini', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar o resumo agora (falha na IA). O diagnóstico e o fechamento continuam funcionando normalmente sem ele — tente de novo mais tarde.' },
      { status: 502 },
    );
  }

  // 3. Persistência na linha GERAL do dia — sobrescreve só `resumo_ia`;
  // `resumo_editado` (edição manual do Admin) nunca é tocado por aqui.
  const geradoEm = new Date().toISOString();
  const { data: linhas } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('data_dia, fechado_por, resumo_editado')
    .eq('data_dia', dataDia);
  const geral = (linhas ?? []).find(f => ehFechamentoGeral(f.fechado_por));

  if (!geral) {
    return NextResponse.json({
      dataDia, resumo, geradoEm, salvo: false,
      aviso: 'O dia ainda não tem fechamento geral — o resumo foi gerado mas não salvo (salvar exigiria criar a linha e o dia apareceria como fechado). Feche o caixa e gere de novo.',
    });
  }

  // Linha geral histórica pode ter fechado_por NULL (ex.: 03-07-26) — filtro
  // com .is() nesse caso, .eq() não casa NULL.
  let upd = supabaseAdmin
    .from('jsgrafica_fechamento')
    .update({ resumo_ia: resumo, resumo_gerado_em: geradoEm })
    .eq('data_dia', dataDia);
  upd = geral.fechado_por == null ? upd.is('fechado_por', null) : upd.eq('fechado_por', geral.fechado_por);
  const { error: erroSalvar } = await upd;
  if (erroSalvar) {
    console.error('[152] Resumo gerado mas falhou ao salvar', erroSalvar);
    return NextResponse.json({ dataDia, resumo, geradoEm, salvo: false, aviso: 'Resumo gerado, mas falhou ao salvar no banco.' });
  }

  return NextResponse.json({
    dataDia, resumo, geradoEm, salvo: true,
    resumoEditadoPreservado: !!geral.resumo_editado,
  });
}

// ── Demanda 153 (Camada D): salvar a edição manual do Admin ──
// Grava SÓ `resumo_editado` — nunca toca `resumo_ia`/`resumo_gerado_em`.
// Texto vazio remove a edição (a tela volta a mostrar o texto da IA).
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const dataDia = body.data || formatarDiaCaixa();
    if (!parseDiaCaixa(dataDia)) {
      return NextResponse.json({ error: 'Data inválida — use DD-MM-AA (ex.: 07-07-26)' }, { status: 400 });
    }
    if (typeof body.resumoEditado !== 'string') {
      return NextResponse.json({ error: 'resumoEditado (texto) é obrigatório' }, { status: 400 });
    }
    const texto = body.resumoEditado.trim() || null;

    const { data: linhas } = await supabaseAdmin
      .from('jsgrafica_fechamento')
      .select('data_dia, fechado_por')
      .eq('data_dia', dataDia);
    const geral = (linhas ?? []).find(f => ehFechamentoGeral(f.fechado_por));
    if (!geral) {
      return NextResponse.json({ error: 'Este dia ainda não tem fechamento geral — não há onde salvar a edição.' }, { status: 404 });
    }

    let upd = supabaseAdmin
      .from('jsgrafica_fechamento')
      .update({ resumo_editado: texto })
      .eq('data_dia', dataDia);
    upd = geral.fechado_por == null ? upd.is('fechado_por', null) : upd.eq('fechado_por', geral.fechado_por);
    const { error } = await upd;
    if (error) throw error;

    return NextResponse.json({ success: true, dataDia, edicaoRemovida: texto === null });
  } catch (error) {
    console.error('[153] Falha ao salvar edição do resumo', error);
    return NextResponse.json({ error: 'Erro ao salvar a edição do resumo' }, { status: 500 });
  }
}
