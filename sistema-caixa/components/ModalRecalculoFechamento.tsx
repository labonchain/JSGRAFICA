"use client";

import { useState, useEffect } from "react";

// Demanda 231 — modo prévia + aplicar do recálculo de fechamento "Sistema"
// desatualizado. Nunca aplica nada sozinho: abre sempre mostrando a prévia
// (cascata inteira, do 1º dia afetado até o último fechamento existente),
// e só grava no banco depois de um clique explícito e separado do Admin em
// "Aplicar recálculo" — mesmo espírito de cuidado das demandas 217/223.

interface PreviaRecalculoDia {
  dataDia: string;
  totalEntradasAntes: number; totalEntradasDepois: number;
  totalSaidasAntes: number; totalSaidasDepois: number;
  saldoAnteriorAntes: number; saldoAnteriorDepois: number;
  saldoAcumuladoAntes: number; saldoAcumuladoDepois: number;
  divergenciaAntes: number; divergenciaDepois: number;
  itensIncluidos: { pendenciaId: string; tipo: "entrada" | "saida"; valor: number }[];
}

interface ResultadoAplicarDia {
  dataDia: string;
  aplicado: boolean;
  motivo?: string;
  valoresNovos?: { totalEntradas: number; totalSaidas: number; saldoAnterior: number; saldoAcumulado: number; divergencia: number };
}

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Antes({ antes, depois }: { antes: number; depois: number }) {
  const mudou = Math.abs(antes - depois) >= 0.005;
  return (
    <span className="whitespace-nowrap">
      {moeda(antes)}
      {mudou && <span className="text-blue-600 font-semibold"> → {moeda(depois)}</span>}
    </span>
  );
}

export function ModalRecalculoFechamento({ onFechar, onAplicado }: {
  onFechar: () => void;
  onAplicado: () => void;
}) {
  const [previa, setPrevia] = useState<PreviaRecalculoDia[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoAplicarDia[] | null>(null);

  useEffect(() => {
    carregarPrevia();
  }, []);

  async function carregarPrevia() {
    setCarregando(true);
    setErro(null);
    setResultados(null);
    try {
      const res = await fetch("/api/conciliacao/recalculo-previa");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar prévia");
      setPrevia(data.previa ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar prévia");
    } finally {
      setCarregando(false);
    }
  }

  async function aplicar() {
    if (!previa || previa.length === 0) return;
    const totalItens = previa.reduce((s, d) => s + d.itensIncluidos.length, 0);
    if (!confirm(
      `Aplicar o recálculo em ${previa.length} dia(s), incluindo ${totalItens} item(ns) de conciliação?\n\n` +
      `Isso vai atualizar total_entradas/total_saidas/saldo_acumulado/divergência desses fechamentos já fechados. Não dá pra desfazer com 1 clique.`
    )) return;

    setAplicando(true);
    setErro(null);
    try {
      const diasEsperados = previa.map(d => ({
        dataDia: d.dataDia,
        pendenciaIds: d.itensIncluidos.map(i => i.pendenciaId),
      }));
      const res = await fetch("/api/conciliacao/recalculo-aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasEsperados }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao aplicar recálculo");
      setResultados(data.resultados ?? []);
      onAplicado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao aplicar recálculo");
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[52rem] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-base mb-1">🔄 Recálculo de fechamento desatualizado</h3>
        <p className="text-sm text-gray-500 mb-4">
          Prévia — nada foi aplicado ainda. Mostra o antes/depois do dia afetado e de todos os dias
          seguintes até o último fechamento existente (a correção se propaga pela cadeia de saldo).
        </p>

        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{erro}</p>}

        {carregando ? (
          <p className="text-sm text-gray-300 text-center py-8">Calculando prévia...</p>
        ) : !previa || previa.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nada pendente de recálculo no momento.</p>
        ) : (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">Dia</th>
                    <th className="text-right px-3 py-2">Entradas</th>
                    <th className="text-right px-3 py-2">Saídas</th>
                    <th className="text-right px-3 py-2">Saldo acumulado</th>
                    <th className="text-right px-3 py-2">Divergência</th>
                    <th className="text-right px-3 py-2">Itens</th>
                    <th className="text-left px-3 py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.map(d => {
                    const res = resultados?.find(r => r.dataDia === d.dataDia);
                    return (
                      <tr key={d.dataDia} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-semibold text-gray-700">{d.dataDia}</td>
                        <td className="px-3 py-2 text-right"><Antes antes={d.totalEntradasAntes} depois={d.totalEntradasDepois} /></td>
                        <td className="px-3 py-2 text-right"><Antes antes={d.totalSaidasAntes} depois={d.totalSaidasDepois} /></td>
                        <td className="px-3 py-2 text-right"><Antes antes={d.saldoAcumuladoAntes} depois={d.saldoAcumuladoDepois} /></td>
                        <td className="px-3 py-2 text-right"><Antes antes={d.divergenciaAntes} depois={d.divergenciaDepois} /></td>
                        <td className="px-3 py-2 text-right text-gray-500">{d.itensIncluidos.length || "—"}</td>
                        <td className="px-3 py-2">
                          {res ? (
                            res.aplicado
                              ? <span className="text-green-700">✓ aplicado</span>
                              : <span className="text-red-600">🔴 parou: {res.motivo}</span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!resultados && (
              <div className="flex items-center gap-3">
                <button onClick={aplicar} disabled={aplicando}
                  className="bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-800 disabled:opacity-50">
                  {aplicando ? "Aplicando..." : "Aplicar recálculo"}
                </button>
                <button onClick={carregarPrevia} disabled={aplicando}
                  className="text-sm text-gray-500 hover:text-gray-700">
                  Recarregar prévia
                </button>
              </div>
            )}
            {resultados && (
              <p className="text-sm text-gray-500">
                {resultados.every(r => r.aplicado)
                  ? "Recálculo aplicado em todos os dias acima."
                  : "Parou antes de terminar — veja o motivo na coluna Resultado. Os dias já aplicados (✓) ficaram gravados; recarregue a prévia pra ver o que ainda falta."}
              </p>
            )}
          </>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onFechar} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Fechar</button>
        </div>
      </div>
    </div>
  );
}
