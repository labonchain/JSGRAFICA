// Chamada mínima à API do Gemini (Google AI Studio) — usada só pelas duas
// features manuais da demanda 048 (sugestão de resposta / resumir conversa).
// Nunca chamada automaticamente: sempre disparada por clique explícito do
// atendente, e a resposta nunca é enviada sozinha ao cliente.

import { agoraRecife } from './supabase';

// gemini-2.0-flash foi descontinuado pelo Google (404 "no longer available",
// achado real na demanda 063) — trocado pro modelo estável atual confirmado
// funcionando (testado direto via generateContent, não só verificado como
// "listado" — gemini-2.0-flash também aparece listado em /v1beta/models e
// mesmo assim falha, então listagem sozinha não garante nada).
const GEMINI_MODEL = 'gemini-2.5-flash';

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function periodoDoDia(hora: number): 'manhã' | 'tarde' | 'noite' {
  if (hora >= 5 && hora < 12) return 'manhã';
  if (hora >= 12 && hora < 18) return 'tarde';
  return 'noite';
}

// Demanda 267 (achado do Edvam): nenhum prompt injetava data/hora — a IA não
// tinha como saber se era de madrugada (sugeria "bom dia" a qualquer hora)
// nem o dia da semana. Período do dia SEMPRE calculado aqui no código, nunca
// deixado pra IA "adivinhar" a partir do texto da conversa — mesmo timezone
// de sempre (agoraRecife, lib/supabase.ts).
export function contextoDataHoraAtual(): string {
  const agora = agoraRecife();
  const diaSemana = DIAS_SEMANA[agora.getDay()];
  const dataTexto = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`;
  const horaTexto = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  const periodo = periodoDoDia(agora.getHours());
  return `Contexto temporal (horário de Recife-PE, use isso, nunca chute a hora a partir do texto da conversa): hoje é ${diaSemana}, ${dataTexto}, agora são ${horaTexto} — período do dia: ${periodo}. Calibre a saudação por isso (ex.: não sugira "bom dia" fora do período da manhã).`;
}

// Demanda 152: `opts` opcional — o resumo do fechamento precisa de mais
// espaço de saída que a sugestão de resposta (500 cortava o texto). Sem
// opts, comportamento idêntico ao de sempre.
export async function chamarGemini(prompt: string, opts?: { maxOutputTokens?: number; temperature?: number }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada — peça pro Edvam adicionar a chave (aistudio.google.com/apikey) no .env.local e na Vercel');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // thinkingBudget: 0 desliga o "pensamento" interno do gemini-2.5-flash
        // — sem isso, o modelo gasta tokens pensando do mesmo orçamento de
        // maxOutputTokens e corta a resposta real pela metade (achado real
        // da demanda 064: 285 de 300 tokens gastos "pensando", finishReason
        // MAX_TOKENS). Não é necessário pra uma tarefa simples de sugestão.
        generationConfig: {
          temperature: opts?.temperature ?? 0.4,
          maxOutputTokens: opts?.maxOutputTokens ?? 500,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`Gemini API respondeu ${res.status}: ${corpo.slice(0, 300)}`);
  }

  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  if (!texto.trim()) throw new Error('Gemini retornou resposta vazia');
  return texto.trim();
}

// ─── Transcrição de áudio (demanda 059) ─────────────────────────
// Gemini processa áudio nativamente (envio inline em base64) — não precisa
// de um serviço de transcrição separado. Botão manual no Inbox pra quando o
// pipeline automático do n8n falha (transcription_text vazio).
export async function transcreverAudioGemini(audioUrl: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada — peça pro Edvam adicionar a chave (aistudio.google.com/apikey) no .env.local e na Vercel');
  }

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Não consegui baixar o áudio (${audioRes.status}) — o link pode ter expirado`);
  }
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = audioRes.headers.get('content-type') || 'audio/ogg';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Transcreva este áudio em português. Devolva só o texto transcrito, sem comentário nenhum antes ou depois.' },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        // Mesmo fix da demanda 064 (thinkingBudget: 0) — ver comentário em
        // chamarGemini() acima.
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );

  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`Gemini API respondeu ${res.status}: ${corpo.slice(0, 300)}`);
  }

  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  if (!texto.trim()) throw new Error('Gemini não conseguiu transcrever esse áudio');
  return texto.trim();
}

// ─── Análise de imagem/PDF (demanda 203 — spike técnico) ────────
// Mesmo padrão técnico da transcrição de áudio acima (059): baixa a mídia
// da URL real do sistema, converte pra base64, manda como `inlineData` pro
// Gemini (que lê imagem e PDF nativamente, sem OCR à parte). Existe pra
// provar se a Fase 1 do agente de WhatsApp (OBJETIVOS-MACRO.md, objetivo 2)
// é viável como desenhada: quando chega mídia sem legenda, o agente precisa
// saber se é "documento óbvio de 1 página" (propõe produto/preço direto) ou
// "algo ambíguo" (pergunta em aberto, padrão medido na demanda 162).
// IMPORTANTE: esta função não é chamada por nenhum fluxo real ainda (nenhuma
// tela, nenhum webhook do n8n) — só o script de spike da 203 a usa. Conectar
// numa conversa de verdade é território da Fase B (outra demanda).
export interface AnaliseMidiaGemini {
  tipoMidia: 'imagem' | 'pdf' | 'outro';
  // null quando o Gemini não conseguiu determinar (nunca deveria acontecer
  // pra imagem/pdf legítimos, mas a resposta do modelo não é 100% garantida).
  numeroPaginas: number | null;
  classificacao: 'documento_obvio' | 'ambiguo';
  produtoOuValorDetectado: string | null;
  // Texto cru do Gemini — guardado pra auditoria/depuração do spike, não é
  // parte da "resposta" estruturada em si.
  respostaBruta: string;
}

export async function analisarMidiaGemini(mediaUrl: string): Promise<AnaliseMidiaGemini> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada — peça pro Edvam adicionar a chave (aistudio.google.com/apikey) no .env.local e na Vercel');
  }

  const midiaRes = await fetch(mediaUrl);
  if (!midiaRes.ok) {
    throw new Error(`Não consegui baixar a mídia (${midiaRes.status}) — o link pode ter expirado`);
  }
  const buffer = Buffer.from(await midiaRes.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = midiaRes.headers.get('content-type') || 'application/octet-stream';

  const prompt = `Você está analisando um arquivo enviado por um cliente numa conversa de WhatsApp com uma gráfica rápida (JS Gráfica, Recife-PE). Responda SOMENTE em JSON válido, sem nenhum texto antes ou depois, no formato exato:
{
  "tipo_midia": "imagem" ou "pdf",
  "numero_paginas": número inteiro (1 se for imagem ou PDF de 1 página; conte de verdade se o PDF tiver mais de 1 página),
  "classificacao": "documento_obvio" (é claramente um documento de 1 página só — boleto, fatura, comprovante — dá pra identificar o que é e propor produto/preço de impressão direto) ou "ambiguo" (foto solta, documento de várias páginas, ou qualquer coisa que precise perguntar mais pro cliente antes de saber o que ele quer impresso),
  "produto_ou_valor_detectado": se for documento_obvio, descrição curta do que foi identificado (ex: "Boleto Enel R$ 145,30, vencimento 20/07") — null se ambíguo ou não identificado
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );

  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`Gemini API respondeu ${res.status}: ${corpo.slice(0, 300)}`);
  }

  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '';
  if (!texto.trim()) throw new Error('Gemini retornou resposta vazia');

  // O prompt pede JSON puro, mas o modelo às vezes cerca com ```json ... ```
  // mesmo assim — extrai só o trecho entre chaves em vez de confiar que
  // `texto` inteiro é JSON válido.
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Gemini não devolveu JSON reconhecível: ${texto.slice(0, 200)}`);
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    tipoMidia: parsed.tipo_midia === 'pdf' ? 'pdf' : parsed.tipo_midia === 'imagem' ? 'imagem' : 'outro',
    numeroPaginas: typeof parsed.numero_paginas === 'number' ? parsed.numero_paginas : null,
    classificacao: parsed.classificacao === 'documento_obvio' ? 'documento_obvio' : 'ambiguo',
    produtoOuValorDetectado: parsed.produto_ou_valor_detectado ?? null,
    respostaBruta: texto,
  };
}
