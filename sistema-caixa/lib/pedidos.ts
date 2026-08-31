// Lógica de precificação de pedidos — referência: nó "CALCULAR VALOR" do
// workflow n8n "06 - JSGRAFICA | PEDIDOS" (desconto de 10% para 50+ unidades
// em categorias de impressão/xerox). Extraída aqui para ser reaproveitada
// tanto pela rota de preview (/api/pedidos/calcular-valor) quanto pela
// gravação final (/api/pedidos POST), evitando duplicar a regra.

export const GRUPOS_COM_DESCONTO_VOLUME = ['Xerox', 'Impressão'];
export const QUANTIDADE_MINIMA_DESCONTO = 50;
export const DESCONTO_VOLUME_PCT = 10;

export interface CalculoPedido {
  valorUnitario: number;
  quantidade: number;
  valorTotal: number;
  descontoPct: number;
  valorFinal: number;
}

export function calcularValorPedido(valorUnitario: number, quantidade: number, grupo: string): CalculoPedido {
  const valorTotalBruto = valorUnitario * quantidade;
  const descontoPct = GRUPOS_COM_DESCONTO_VOLUME.includes(grupo) && quantidade >= QUANTIDADE_MINIMA_DESCONTO
    ? DESCONTO_VOLUME_PCT
    : 0;
  const valorFinal = Math.round(valorTotalBruto * (1 - descontoPct / 100) * 100) / 100;
  const valorTotal = Math.round(valorTotalBruto * 100) / 100;
  return { valorUnitario, quantidade, valorTotal, descontoPct, valorFinal };
}

export interface DadosConfirmacaoPedido {
  servicoNome: string;
  quantidade: number;
  valorFinal: number;
  descontoPct: number;
  pagamentoTipo: string;
  chavePix?: string | null;
  titularPix?: string | null;
}

// Demanda 141 (Fase 3): o trecho de Pix da mensagem deixou de ser derivado
// do `pagamento_tipo` do produto — quem decide se existe (e qual valor cobre)
// é o CHAMADOR, que sabe se houve escolha explícita de Pix (Fase 1), se é o
// fallback legado (pre_producao) ou se não há Pix nenhum.
// `copiaECola` presente = cobrança real criada (124); null = cobrança falhou
// ou MP fora do ar → texto antigo da chave estática (062).
export interface CobrancaPixMensagem {
  copiaECola: string | null;
  valor: number;
}

// Texto do trecho de Pix — compartilhado entre pedido único e múltiplo, só
// muda a frase de abertura. Com cobrança real: copia-e-cola + confirmação
// automática (sem pedir comprovante). Sem: chave estática + comprovante,
// exatamente o texto da 062.
// Demanda 300: exportado pra ser reaproveitado no retentar-Pix (retry depois
// de corrigir telefone @lid) — mesmo texto de sempre, abertura diferente.
export function montarTrechoPix(abertura: string, valor: number, chavePix?: string | null, titularPix?: string | null, pixCopiaECola?: string | null): string {
  if (pixCopiaECola) {
    // Demanda 250: a frase antiga prometia confirmação "automática" que não
    // existia (o sistema detecta o pagamento sozinho, mas ninguém avisava o
    // cliente — silêncio até um humano perceber). Agora existe um rascunho
    // de confirmação gerado assim que o pagamento é detectado
    // (`gerarRascunhosPagamentoConfirmado`, lib/mercadopago.ts) — o texto
    // aqui reflete isso com precisão: "a gente avisa" (equipe manda o
    // rascunho já pronto), não "confirma automaticamente" (nunca é enviado
    // sozinho, convenção de sempre — CLAUDE.md).
    return `${abertura}\n\nPix copia e cola (válido por 24h):\n\n${pixCopiaECola}\n\n💰 Valor: *R$ ${valor.toFixed(2)}*\n\nÉ só copiar o código acima e colar na área Pix do app do seu banco. Assim que o pagamento cair, a gente avisa por aqui 😊`;
  }
  return `${abertura}\n\nChave Pix:\n📱 *${chavePix || '81 98610-8547'}*\nTitular: ${titularPix || 'Edvam de Oliveira e Silva'}\n💰 Valor: *R$ ${valor.toFixed(2)}*\n\nQuando fizer o pix, me manda o comprovante aqui.`;
}

// Mensagens automáticas ao confirmar "Criar pedido" no Inbox (demanda 062) —
// texto fixo por template (reaproveita o tom dos nós "MONTAR CONFIRMACAO" /
// "AVISAR CLIENTE PEDIDO CRIADO" / "ENVIAR PIX CLIENTE" do workflow
// 06-PEDIDOS, nunca ligados ao fluxo manual). Determinístico, sem IA — os
// mesmos dados sempre geram o mesmo texto, nada de lib/gemini.ts aqui.
// Devolve 1 mensagem (sem Pix) ou 2 (confirmação + Pix, quando o produto
// exige pagamento antes de produzir).
export function montarMensagensConfirmacaoPedido(d: DadosConfirmacaoPedido, cobrancaPix?: CobrancaPixMensagem | null): string[] {
  const valorTexto = d.descontoPct > 0
    ? `💰 R$ ${d.valorFinal.toFixed(2)} (${d.descontoPct}% de desconto aplicado)`
    : `💰 R$ ${d.valorFinal.toFixed(2)}`;
  const specsTexto = d.quantidade > 1 ? `📦 Qtd: ${d.quantidade}\n` : '';
  // Demanda 141: a frase de confirmação acompanha a existência da seção de
  // Pix (decisão do chamador) — não mais o `pagamento_tipo` do produto.
  const temPix = cobrancaPix != null;

  const confirmacao = temPix
    ? `Pedido confirmado! 😊\n\n🖨️ *${d.servicoNome}*\n${specsTexto}${valorTexto}\n\nAssim que confirmarmos o pagamento, a gente começa a produção.`
    : `Pedido confirmado! 😊\n\n🖨️ *${d.servicoNome}*\n${specsTexto}${valorTexto}\n\nAssim que estiver pronto eu te aviso 😊`;

  if (!temPix) return [confirmacao];

  const pix = montarTrechoPix(
    'Para iniciarmos a produção, precisamos do pagamento antecipado 😊',
    cobrancaPix.valor, d.chavePix, d.titularPix, cobrancaPix.copiaECola,
  );

  return [confirmacao, pix];
}

export interface ItemConfirmacaoPedido {
  servicoNome: string;
  quantidade: number;
  valorFinal: number;
  descontoPct: number;
  pagamentoTipo: string;
}

// Demanda 076: "Criar pedido" no Inbox passou a aceitar 2+ produtos (mesmo
// padrão de venda_id do balcão, demanda 066) — a confirmação vira 1 mensagem
// só cobrindo todos os itens, em vez de 1 mensagem por produto. Com 1 item
// só, mantém o texto exato já usado desde a 062 (reaproveita a função
// acima), pra não mudar a mensagem que o cliente já recebe hoje sem
// necessidade.
export function montarMensagensConfirmacaoPedidoMultiplo(
  itens: ItemConfirmacaoPedido[],
  chavePix?: string | null,
  titularPix?: string | null,
  // Demanda 141: quem decide se há seção de Pix (e o valor dela) é o
  // chamador — cobre tanto a escolha explícita de Pix (valor = total da
  // venda) quanto o fallback legado (valor = só os itens pre_producao).
  cobrancaPix?: CobrancaPixMensagem | null,
): string[] {
  if (itens.length === 1) {
    return montarMensagensConfirmacaoPedido({ ...itens[0], chavePix, titularPix }, cobrancaPix);
  }

  const linhas = itens.map(it => {
    const qtdTexto = it.quantidade > 1 ? ` (Qtd: ${it.quantidade})` : '';
    const descTexto = it.descontoPct > 0 ? ` · ${it.descontoPct}% desc.` : '';
    return `• ${it.servicoNome}${qtdTexto}: R$ ${it.valorFinal.toFixed(2)}${descTexto}`;
  }).join('\n');
  const totalGeral = Math.round(itens.reduce((acc, i) => acc + i.valorFinal, 0) * 100) / 100;

  const confirmacao = `Pedido confirmado! 😊\n\n🖨️ *Itens do seu pedido:*\n${linhas}\n\n💰 *Total: R$ ${totalGeral.toFixed(2)}*\n\nAssim que tudo estiver pronto eu te aviso 😊`;

  if (!cobrancaPix) return [confirmacao];

  // Abertura: se a cobrança cobre o total da venda, fala do pedido inteiro;
  // se cobre menos (fallback legado, só itens pre_producao), mantém o texto
  // de "alguns itens" da 076.
  const cobreTudo = Math.abs(cobrancaPix.valor - totalGeral) < 0.01;
  const pix = montarTrechoPix(
    cobreTudo
      ? 'Para iniciarmos a produção, precisamos do pagamento antecipado 😊'
      : 'Para iniciarmos a produção de alguns itens, precisamos do pagamento antecipado 😊',
    cobrancaPix.valor, chavePix, titularPix, cobrancaPix.copiaECola,
  );
  return [confirmacao, pix];
}

export interface ItemPagamentoConfirmado {
  servicoNome: string;
  quantidade: number;
  valorFinal: number;
}

// Demanda 250: mensagem de confirmação de pagamento — gerada como RASCUNHO
// assim que `confirmarPedidosPagosPorOrder` (lib/mercadopago.ts) detecta o
// pagamento (webhook, polling de reforço ou poll do balcão), fechando de
// verdade a promessa que o trecho de Pix já fazia. Nunca enviada sozinha —
// fica pronta pro Admin mandar com 1 clique (mesma convenção de sempre,
// CLAUDE.md: "sem auto-resposta ao cliente via WhatsApp"). Determinístico,
// sem IA, mesmo espírito de `montarMensagensConfirmacaoPedido(Multiplo)`.
export function montarMensagemPagamentoConfirmado(itens: ItemPagamentoConfirmado[]): string {
  if (itens.length === 1) {
    const it = itens[0];
    const qtdTexto = it.quantidade > 1 ? ` (Qtd: ${it.quantidade})` : '';
    return `✅ Recebemos seu pagamento! 😊\n\n🖨️ *${it.servicoNome}*${qtdTexto}\n💰 R$ ${it.valorFinal.toFixed(2)}\n\nJá vamos começar a produção.`;
  }

  const linhas = itens.map(it => {
    const qtdTexto = it.quantidade > 1 ? ` (Qtd: ${it.quantidade})` : '';
    return `• ${it.servicoNome}${qtdTexto}: R$ ${it.valorFinal.toFixed(2)}`;
  }).join('\n');
  const total = Math.round(itens.reduce((acc, i) => acc + i.valorFinal, 0) * 100) / 100;
  return `✅ Recebemos seu pagamento! 😊\n\n🖨️ *Itens:*\n${linhas}\n\n💰 *Total: R$ ${total.toFixed(2)}*\n\nJá vamos começar a produção.`;
}
