// Mapeamento categoria (Supabase) → grupo (PDV). Demanda 057: "Impressão" virou
// grupo único (ofício/adesivo/cartão/couché/foto, antes espalhados em 3 grupos
// diferentes); "Recargas" ficou só com recarga de verdade (celular/VEM) — os
// produtos que não eram recarga saíram pra "Personalizados" na demanda 056
// (dado). "Escritório" e "Seviço terceirizado" (categorias novas, criadas
// direto no catálogo fora desta demanda) ganharam grupo próprio em vez de
// cair no fallback implícito — só pra controlar a posição em ORDEM_GRUPOS.
export const CATEGORIA_PARA_GRUPO: Record<string, string> = {
  'xerox':                   'Xerox',
  'Impressão papel oficio':  'Impressão',
  'Impressão papel adesivo': 'Impressão',
  'Impressão papel cartao':  'Impressão',
  'Impressão papel couche':  'Impressão',
  'Impressão papel foto':    'Impressão',
  'Consulta Online':         'Serviços',
  'Plastificação':           'Plastificação',
  'Encadernacao':            'Encadernação',
  'Recarga celular':         'Recargas',
  'Recarga vem':             'Recargas',
  'Personalizados':          'Personalizados',
  'Escritório':              'Escritório',
  'Seviço terceirizado':     'Serviço Terceirizado',
};

// Demanda 224: mesma lista de `lib/supabase-admin.ts` (CATEGORIAS_RECARGA),
// duplicada de propósito aqui — aquele arquivo importa a service_role key e
// nunca pode ser importado de código client-side. Usado pra saber, no
// client, se um carrinho é 100% recarga (esconder "Pix" genérico/mostrar
// "Pix RecargaPay" nas telas de confirmação).
export const CATEGORIAS_RECARGA = ['Recarga vem', 'Recarga celular'];

export const ORDEM_GRUPOS = [
  'Xerox', 'Impressão', 'Plastificação', 'Encadernação', 'Recargas',
  'Serviço Terceirizado', 'Personalizados', 'Escritório', 'Serviços',
];

// Dentro do grupo "Impressão" (unificado na demanda 057 — antes 5 categorias
// separadas, ~32 produtos somados), ordena por categoria original em vez de
// só por nome, mantendo papel do mesmo tipo agrupado na grade em vez de uma
// lista embaralhada — sugestão de usabilidade da própria demanda (equipe tem
// pouca familiaridade com o sistema, lista longa e desorganizada confunde).
// Grupos com uma única categoria original (todos os outros) não precisam
// disso, a ordem por nome já é natural.
const ORDEM_SUBCATEGORIA_IMPRESSAO = [
  'Impressão papel oficio', 'Impressão papel adesivo', 'Impressão papel cartao',
  'Impressão papel couche', 'Impressão papel foto',
];

export function ordenarProdutosDoGrupo<T extends { categoria: string; nome: string }>(
  nomeGrupo: string, produtos: T[],
): T[] {
  if (nomeGrupo !== 'Impressão') return produtos;
  return [...produtos].sort((a, b) => {
    const ra = ORDEM_SUBCATEGORIA_IMPRESSAO.indexOf(a.categoria);
    const rb = ORDEM_SUBCATEGORIA_IMPRESSAO.indexOf(b.categoria);
    if (ra !== rb) return ra - rb;
    return a.nome.localeCompare(b.nome);
  });
}

// Ícone por grupo — botões grandes de categoria no centro da tela "Pedidos
// Balcão" (demanda 061, mockup aprovado). Fallback genérico pra categoria
// nova que apareça no catálogo sem entrada aqui (ex. categorias criadas
// direto no admin, fora do controle desta lista).
const ICONE_GRUPO: Record<string, string> = {
  'Xerox': '📄',
  'Impressão': '🖨️',
  'Plastificação': '📦',
  'Encadernação': '📚',
  'Recargas': '📱',
  'Serviço Terceirizado': '🏗️',
  'Personalizados': '🎁',
  'Escritório': '🗂️',
  'Serviços': '🧾',
  'Entrada Avulsa': '✏️',
};

export function iconeGrupo(nomeGrupo: string): string {
  return ICONE_GRUPO[nomeGrupo] ?? '🏷️';
}

// Sanitiza texto digitado ou colado no campo Valor (Entrada Avulsa): mantém só
// dígitos e separador decimal (vírgula ou ponto) — colar texto solto nunca vira
// parte do valor da venda.
export function sanitizarValorMonetario(texto: string): string {
  return texto.replace(/[^\d,.]/g, '');
}

// Taxa fixa cobrada por recarga VEM (demanda 052) — valor real informado pelo
// Edvam, não estimativa. Cliente paga o valor cheio da carga, mas o desembolso
// real da gráfica é menor por essa taxa: valor_saida = valor_carga − TAXA_RECARGA_VEM.
export const TAXA_RECARGA_VEM = 2.5;

// Demanda 200: as 7 "contas" (carteiras de dinheiro) do mapa
// (pm/conhecimento/mapa-fluxo-dinheiro-entre-contas.md) — usado como
// `conta_origem` de uma saída (quando o dinheiro que pagou ela não veio da
// gaveta de quem vendeu) e reaproveitado pela demanda 201 (De/Para da tela
// de transferência entre contas). Gaveta física "sem dono" (Edvam) não tem
// entrada própria aqui — o mecanismo dela é `gaveta_destino` (196), conceito
// diferente (pra onde o dinheiro FÍSICO de uma venda vai), não uma conta.
// Demanda 261: "Dinheiro (Geral)" — caso raro, mas real, de depósito/
// transferência que combina caixa físico de mais de um operador (ou que não
// dá pra saber a origem exata) antes de virar movimento digital. Sem dono
// físico único, por isso não entra em `CONTA_ORIGEM_POR_OPERADOR`
// (lib/supabase-admin.ts) — nunca vira "esperado" de ninguém especificamente,
// só conta pro fechamento "Sistema" (agregado), igual às contas digitais.
export const CONTAS_ORIGEM = [
  { id: 'dinheiro_zu',      label: 'Dinheiro (Zu)' },
  { id: 'dinheiro_gabi',    label: 'Dinheiro (Gabi)' },
  { id: 'dinheiro_geral',   label: 'Dinheiro (Geral)' },
  { id: 'mercadopago',      label: 'Mercado Pago' },
  { id: 'stone',            label: 'Stone' },
  { id: 'caixa_economica',  label: 'Caixa Econômica' },
  { id: 'recargapay',       label: 'RecargaPay' },
] as const;
export type ContaOrigemId = (typeof CONTAS_ORIGEM)[number]['id'];
