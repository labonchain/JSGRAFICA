import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente com a chave anônima (pública, RLS aplicada) — o único que pode ser
// importado por componentes "use client" (roda no navegador). Mutações e
// leituras de dado sensível/negócio acontecem via rotas de API com o cliente
// admin (`lib/supabase-admin.ts`), nunca aqui. Ver demanda 024.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── "Agora" no fuso de Recife ──────────────────────────────────
// Em produção (Vercel) o servidor roda em UTC, 3h à frente de Recife — usar
// new Date() puro faz o "dia do caixa" virar antes da hora perto da meia-noite
// local. Este helper devolve um Date cujos getters locais (getDate/getMonth/
// getFullYear/getHours/getDay) refletem o horário de Recife, não o do servidor.
function instanteParaRecife(instante: Date): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Recife',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(instante);
  const p: Record<string, string> = {};
  for (const { type, value } of partes) p[type] = value;
  return new Date(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second)
  );
}

export function agoraRecife(): Date {
  return instanteParaRecife(new Date());
}

// Converte um instante real (ex.: timestamptz do Postgres, como
// jsgrafica_pedidos.data_entregue_at) pro "dia-caixa" (DD-MM-AA) em horário
// de Recife — mesma lógica de agoraRecife(), mas pra um instante qualquer,
// não só "agora". Necessário pra cruzar colunas timestamptz de verdade (que
// carregam o instante absoluto correto) com o resto do sistema, que usa
// data_dia (texto, sempre construído a partir de horário de Recife) em todo
// lugar — comparar um Date "puro" (fuso do servidor) com um Date construído
// via agoraRecife()/parseDiaCaixa (fuso de Recife "fingido") dá resultado
// errado perto da virada do dia (demanda 055).
export function timestampParaDiaCaixa(iso: string): string {
  return formatarDiaCaixa(instanteParaRecife(new Date(iso)));
}

// ─── Limites UTC de um dia-caixa (pra filtrar timestamptz no Postgres) ──
// Recife é UTC-3 fixo (sem horário de verão desde 2019) — dado "DD-MM-AA",
// devolve o intervalo [início, fim) em UTC correspondente ao dia inteiro em
// horário de Recife. Permite usar gte/lt direto no Postgres em colunas
// timestamptz de verdade (ex. jsgrafica_pedidos.data_entregue_at) em vez de
// trazer a tabela inteira pra filtrar em memória — evita o mesmo problema de
// limite de 1.000 linhas por requisição já corrigido nas demandas 041/043
// (demanda 055).
export function limitesDiaCaixaUTC(dataDia: string): { inicio: string; fim: string } | null {
  const m = dataDia.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, aa] = m;
  const inicio = new Date(Date.UTC(2000 + Number(aa), Number(mm) - 1, Number(dd), 3, 0, 0, 0));
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

// ─── Formato de data do caixa: DD-MM-AA ────────────────────────
export function formatarDiaCaixa(data: Date = agoraRecife()): string {
  const dd = String(data.getDate()).padStart(2, '0');
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const aa = String(data.getFullYear()).slice(-2);
  return `${dd}-${mm}-${aa}`;
}

// ─── Converte "DD-MM-AA" para Date real (para ordenar/comparar) ─
// Importante: data_dia é texto DD-MM-AA, então NUNCA ordenar/filtrar
// direto no Postgres com gte/lte/order — o dia vem antes do mês/ano
// e a comparação de texto quebra ao cruzar meses. Sempre converter
// pra Date primeiro.
export function parseDiaCaixa(dataDia: string): Date | null {
  const m = dataDia.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, aa] = m;
  return new Date(2000 + parseInt(aa), parseInt(mm) - 1, parseInt(dd));
}
