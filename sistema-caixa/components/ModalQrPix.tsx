"use client";
import { useState, useEffect } from "react";

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Demanda 179: bloco da recarga na venda MISTA — a cobrança do Mercado Pago
// cobre só os itens comuns; a recarga vai num Pix separado (RecargaPay,
// estático, sem confirmação automática). Com `onConfirmar` (balcões) tem o
// botão de confirmação manual; sem (Inbox), o texto aponta pra aba Pedidos.
function SecaoRecargaMista({ recarga, copiada, onCopiar, onConfirmar }: {
  recarga: NonNullable<CobrancaPixModal["recarga"]>;
  copiada: boolean;
  onCopiar: () => void;
  onConfirmar?: () => void;
}) {
  return (
    <div className="border-2 border-orange-200 bg-orange-50 rounded-xl p-3 mb-4">
      <p className="text-sm font-bold text-orange-800 mb-1">
        ➕ Recarga: {moeda(recarga.valor)} vai num Pix SEPARADO (RecargaPay)
      </p>
      <p className="text-xs text-orange-700 mb-2">
        O QR/código acima <strong>não cobre a recarga</strong>.
        {recarga.chave ? (
          <> A recarga é paga na chave (CNPJ) <strong>{recarga.chave}</strong>
          {recarga.titular ? ` · ${recarga.titular}` : ""} — o cliente digita o valor no app do banco.</>
        ) : (
          <> A chave do RecargaPay não está configurada — combine o Pix da recarga manualmente.</>
        )}
      </p>
      {recarga.qrCode && (
        <button
          onClick={() => { navigator.clipboard.writeText(recarga.qrCode!); onCopiar(); }}
          className="w-full border border-orange-300 text-orange-800 rounded-lg py-1.5 text-xs font-semibold hover:bg-orange-100 mb-2">
          {copiada ? "✓ Copiado!" : "📋 Copiar Pix da recarga"}
        </button>
      )}
      {onConfirmar ? (
        <button onClick={onConfirmar}
          className="w-full bg-orange-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-orange-700">
          ✓ Recarga paga — conferi no RecargaPay
        </button>
      ) : (
        <p className="text-[10px] text-orange-600">
          Confirme o pagamento da recarga depois, na aba Pedidos (confirmação manual).
        </p>
      )}
    </div>
  );
}

// Demanda 145: o modal de QR Pix nasceu na 141 duplicado nos 2 balcões
// (app/page.tsx e app/pdv/page.tsx) — extraído pra cá pra ser reaproveitado
// também no Inbox, que ganhou o mesmo popup (antes o copia-e-cola ia só pro
// rascunho de mensagem e passava batido). O poll de 5s usa o endpoint da 141,
// que confirma o(s) pedido(s) de verdade (`confirmarPedidosPagosPorOrder`),
// não só olha o status.
export interface CobrancaPixModal {
  orderId: string;
  qrCode: string;
  qrCodeBase64: string | null;
  valor: number;
  erro?: boolean;
  // Demanda 147: Pix ESTÁTICO do RecargaPay (recargas VEM/celular) — QR fixo,
  // cliente digita o valor no banco, sem poll (não tem API pra conferir),
  // confirmação sempre manual.
  estatico?: boolean;
  chave?: string;
  titular?: string;
  // Demanda 179: venda MISTA (recarga + item comum) — a cobrança acima cobre
  // só os itens comuns; este bloco carrega a instrução separada da recarga
  // (Pix estático do RecargaPay), que é confirmada manualmente.
  recarga?: {
    valor: number;
    pedidoIds: string[];
    chave: string | null;
    titular: string | null;
    qrCode: string | null;
    qrCodeBase64: string | null;
  } | null;
}

export function ModalQrPix({ cobranca, onFechar, onCancelarVenda, onConfirmarPagamento, onConfirmarRecarga, textoErro }: {
  cobranca: CobrancaPixModal;
  onFechar: () => void;
  // Demanda 142 (só balcões): cancela a venda DE VERDADE. Quando ausente
  // (Inbox), o botão não existe — cancelar pedido do Inbox tem fluxo próprio.
  onCancelarVenda?: () => void;
  // Demanda 147 (só balcões, modo estático): o atendente confere o
  // recebimento no app do RecargaPay e marca a venda como paga por aqui.
  onConfirmarPagamento?: () => void;
  // Demanda 179 (só balcões, venda mista): confirma manualmente SÓ os itens
  // de recarga (a parte do MP confirma sozinha pelo poll/webhook). Ausente
  // no Inbox — lá a confirmação é depois, pela aba Pedidos.
  onConfirmarRecarga?: () => void;
  // Texto do estado de erro — o padrão fala da aba Pedidos (balcão); o Inbox
  // passa um texto que aponta pro rascunho com a chave estática.
  textoErro?: string;
}) {
  const [pago, setPago] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [recargaCopiada, setRecargaCopiada] = useState(false);

  useEffect(() => {
    if (pago || cobranca.erro || cobranca.estatico || !cobranca.orderId) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/mercadopago/cobranca?orderId=${encodeURIComponent(cobranca.orderId)}`);
        const d = await r.json();
        if (d.pago) setPago(true);
      } catch { /* silencioso — tenta de novo no próximo tick */ }
    }, 5000);
    return () => clearInterval(t);
  }, [pago, cobranca.orderId, cobranca.erro, cobranca.estatico]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-[26rem] max-h-[90vh] overflow-y-auto">
        {cobranca.erro ? (
          <>
            <h3 className="font-bold text-gray-800 text-base mb-2">⚠️ QR Pix indisponível</h3>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              {textoErro || "A venda foi registrada normalmente, mas não deu pra gerar a cobrança Pix agora. Combine o Pix manualmente e confirme o pagamento depois na aba Pedidos."}
            </p>
            <div className="flex gap-2">
              {onCancelarVenda && (
                <button onClick={onCancelarVenda}
                  className="flex-1 border border-red-200 text-red-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-red-50">
                  Cancelar venda
                </button>
              )}
              <button onClick={onFechar}
                className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </>
        ) : pago ? (
          <>
            <div className="text-center py-4">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="font-bold text-green-700 text-lg mb-1">Pagamento confirmado!</h3>
              <p className="text-sm text-gray-500">{moeda(cobranca.valor)} recebido via Pix.</p>
            </div>
            {/* Demanda 179: o Pix do MP caiu, mas a RECARGA é paga por fora
                (RecargaPay) — não deixa a tela de sucesso esconder isso. */}
            {cobranca.recarga && (
              <SecaoRecargaMista recarga={cobranca.recarga} copiada={recargaCopiada}
                onCopiar={() => setRecargaCopiada(true)} onConfirmar={onConfirmarRecarga} />
            )}
            <button onClick={onFechar}
              className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700">
              Fechar
            </button>
          </>
        ) : (
          <>
            <h3 className="font-bold text-gray-800 text-base mb-1">
              {cobranca.estatico ? "Pagamento Pix — RecargaPay" : "Pagamento Pix"}
            </h3>
            <p className="text-gray-400 text-sm mb-1">Valor: <strong className="text-blue-700">{moeda(cobranca.valor)}</strong></p>
            {cobranca.estatico && (
              <p className="text-xs text-gray-500 mb-3">
                Chave (CNPJ): <strong>{cobranca.chave}</strong>{cobranca.titular ? ` · ${cobranca.titular}` : ""}
                <br />O cliente digita o valor no app do banco — o QR não carrega valor.
              </p>
            )}
            {!cobranca.estatico && <div className="mb-3" />}
            {cobranca.qrCodeBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${cobranca.qrCodeBase64}`} alt="QR code Pix"
                className="w-56 h-56 mx-auto border border-gray-200 rounded-xl mb-3" />
            )}
            <p className="text-xs text-gray-500 mb-1 font-semibold">Ou copia e cola:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-[10px] text-gray-600 break-all max-h-20 overflow-y-auto mb-2">
              {cobranca.qrCode}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(cobranca.qrCode); setPixCopiado(true); }}
              className="w-full border border-blue-200 text-blue-700 rounded-lg py-2 text-sm font-semibold hover:bg-blue-50 mb-4">
              {pixCopiado ? "✓ Copiado!" : "📋 Copiar código"}
            </button>
            {cobranca.estatico ? (
              <div className="text-sm text-amber-700 bg-amber-50 rounded-lg py-2.5 px-3 mb-4 text-center">
                ⏳ Confirmação manual — confira o recebimento no app do RecargaPay.
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg py-2.5 mb-4">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                Aguardando pagamento...
              </div>
            )}
            {/* Demanda 179: venda mista — a cobrança acima NÃO cobre a
                recarga; instrução separada do RecargaPay, sempre visível. */}
            {cobranca.recarga && (
              <SecaoRecargaMista recarga={cobranca.recarga} copiada={recargaCopiada}
                onCopiar={() => setRecargaCopiada(true)} onConfirmar={onConfirmarRecarga} />
            )}
            {onConfirmarPagamento && (
              <button onClick={onConfirmarPagamento}
                className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700 mb-2">
                ✓ Confirmar pagamento
              </button>
            )}
            <div className="flex gap-2">
              {onCancelarVenda && (
                <button onClick={onCancelarVenda}
                  className="flex-1 border border-red-200 text-red-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-red-50">
                  Cancelar venda
                </button>
              )}
              <button onClick={onFechar}
                className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50"
                title={cobranca.estatico ? "Pode fechar — confirme o pagamento depois na aba Pedidos" : "Pode fechar — se o cliente pagar depois, a confirmação continua automática"}>
                Fechar
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              {cobranca.estatico
                ? "Fechar só esconde — dá pra confirmar o pagamento depois na aba Pedidos."
                : "Fechar só esconde — a confirmação automática continua valendo."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
