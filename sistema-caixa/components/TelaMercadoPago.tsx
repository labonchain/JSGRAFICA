"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_CFG: Record<string, { label: string; classe: string }> = {
  approved:    { label: "Aprovado",  classe: "bg-green-100 text-green-700" },
  pending:     { label: "Pendente",  classe: "bg-gray-100 text-gray-600" },
  in_process:  { label: "Em análise", classe: "bg-amber-100 text-amber-700" },
  rejected:    { label: "Rejeitado", classe: "bg-red-100 text-red-700" },
  refunded:    { label: "Estornado", classe: "bg-red-100 text-red-700" },
  cancelled:   { label: "Cancelado", classe: "bg-gray-100 text-gray-600" },
};

interface Movimentacao {
  id: number;
  status: string;
  statusDetail: string;
  dataCriacao: string;
  dataAprovacao: string | null;
  dataLiberacao: string | null;
  statusLiberacao: string | null;
  metodoPagamento: string;
  tipoPagamento: string;
  valorBruto: number;
  valorLiquido: number | null;
  referenciaExterna: string | null;
}

interface DadosMercadoPago {
  ambiente: "teste" | "producao";
  periodo: { dias: number; dataDia: string | null; inicio: string; fim: string };
  totalMovimentacoes: number;
  saldoBruto: number;
  saldoLiquido: number;
  totalTaxas: number;
  movimentacoes: Movimentacao[];
  token: { criadoEm: string; diasParaExpirar: number };
}

// Mesma conversão DD-MM-AA <-> AAAA-MM-DD já usada em TelaEntradas.tsx/
// TelaConciliacao.tsx (input type="date" é sempre AAAA-MM-DD).
function isoDeDataDia(dataDia: string): string {
  const [dd, mm, aa] = dataDia.split("-");
  if (!dd || !mm || !aa) return "";
  return `20${aa}-${mm}-${dd}`;
}
function dataDiaDeIso(iso: string): string {
  const [aaaa, mm, dd] = iso.split("-");
  if (!dd || !mm || !aaaa) return "";
  return `${dd}-${mm}-${aaaa.slice(-2)}`;
}

// Demanda 084 — piloto Mercado Pago (sem custo): saldo/movimentações montados
// a partir dos pagamentos reais (`GET /v1/payments/search`, síncrono), não de
// relatório assíncrono. Tela própria (não misturado com o fluxo de caixa
// físico das demandas 074/077/121 — são coisas conceitualmente diferentes,
// decisão registrada no relato). Só Admin acessa, mesma decisão da 077/096.
export function TelaMercadoPago() {
  const [dados, setDados] = useState<DadosMercadoPago | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dias, setDias] = useState(30);
  // Demanda 264: dia específico tem prioridade sobre `dias` quando escolhido
  // — vazio = usa a janela relativa (7/30/90) normal.
  const [dataDia, setDataDia] = useState("");

  const carregar = useCallback(async (periodoAlvo: number, diaAlvo: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const params = diaAlvo ? `dataDia=${diaAlvo}` : `dias=${periodoAlvo}`;
      const r = await fetch(`/api/mercadopago/movimentacoes?${params}`);
      const d = await r.json();
      if (!r.ok || d.error) {
        setErro(d.error || "Erro ao buscar dados do Mercado Pago.");
        return;
      }
      setDados(d);
    } catch {
      setErro("Erro ao buscar dados do Mercado Pago.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(dias, dataDia); }, [dias, dataDia, carregar]);
  // Demanda 136: a aba não desmonta mais ao trocar — recarrega ao reativar.
  useRecarregarAoReativar(() => carregar(dias, dataDia));

  const tokenPertoDeExpirar = dados && dados.token.diasParaExpirar <= 30;
  const tokenExpirado = dados && dados.token.diasParaExpirar <= 0;

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-700">💳 Mercado Pago</h2>
          <p className="text-sm text-gray-500">
            Saldo e movimentações reais da conta — piloto sem custo (demanda 084).
            {dados && (
              <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${dados.ambiente === "teste" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                {dados.ambiente === "teste" ? "Modo Teste (sandbox)" : "Produção"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => { setDataDia(""); setDias(d); }}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                !dataDia && dias === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}>
              {d} dias
            </button>
          ))}
          {/* Demanda 264: dia específico — sobrepõe os botões de janela
              relativa acima enquanto uma data estiver escolhida. */}
          <input type="date" value={dataDia ? isoDeDataDia(dataDia) : ""}
            onChange={e => setDataDia(e.target.value ? dataDiaDeIso(e.target.value) : "")}
            className={`text-xs rounded-full px-3 py-1.5 border focus:outline-none ${
              dataDia ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            }`} />
          {dataDia && (
            <button onClick={() => setDataDia("")} className="text-xs text-gray-400 hover:text-gray-600">
              Ver período
            </button>
          )}
        </div>
      </div>

      {/* Lembrete de expiração do token (seção 6 da base de conhecimento) —
          o token estático do painel não renova sozinho, expira em ~180 dias. */}
      {dados && (tokenExpirado || tokenPertoDeExpirar) && (
        <div className={`rounded-xl border p-4 text-sm ${tokenExpirado ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          {tokenExpirado
            ? `⚠️ O Access Token do Mercado Pago já expirou (gerado em ${new Date(dados.token.criadoEm + "T00:00:00").toLocaleDateString("pt-BR")}). Reative um novo token no painel do desenvolvedor (Modo ${dados.ambiente === "teste" ? "Teste" : "Produção"}) e atualize a credencial no sistema.`
            : `⏳ O Access Token do Mercado Pago expira em ${dados.token.diasParaExpirar} dias (gerado em ${new Date(dados.token.criadoEm + "T00:00:00").toLocaleDateString("pt-BR")}, validade de ~180 dias). Planeje reativar no painel do desenvolvedor antes disso.`}
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          ⚠️ {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : dados ? (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs text-gray-400 mb-1">
                Saldo bruto ({dados.periodo.dataDia ? `dia ${dados.periodo.dataDia}` : `últimos ${dados.periodo.dias} dias`})
              </div>
              <div className="text-xl font-bold text-gray-800">{moeda(dados.saldoBruto)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs text-gray-400 mb-1">Saldo líquido (após taxas)</div>
              <div className="text-xl font-bold text-green-700">{moeda(dados.saldoLiquido)}</div>
            </div>
            {/* Demanda 264: total de taxas pagas no período — bruto − líquido
                de cada movimentação aprovada, somado. */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs text-gray-400 mb-1">Total de taxas pagas</div>
              <div className="text-xl font-bold text-red-600">{moeda(dados.totalTaxas)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs text-gray-400 mb-1">Movimentações no período</div>
              <div className="text-xl font-bold text-gray-800">{dados.totalMovimentacoes}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-700">Movimentações</h3>
            </div>
            {dados.movimentacoes.length === 0 ? (
              <p className="text-sm text-gray-400 p-5">Nenhuma movimentação nesse período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Método</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Referência</th>
                    <th className="py-2.5 px-4 text-right">Bruto</th>
                    <th className="py-2.5 px-4 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.movimentacoes.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 px-4 text-gray-600">{formatarDataHora(m.dataCriacao)}</td>
                      <td className="py-2.5 px-4 text-gray-700">{m.metodoPagamento}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_CFG[m.status]?.classe ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_CFG[m.status]?.label ?? m.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">{m.referenciaExterna ?? "—"}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-800">{moeda(m.valorBruto)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-green-700">{m.valorLiquido !== null ? moeda(m.valorLiquido) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
