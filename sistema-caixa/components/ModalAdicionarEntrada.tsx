"use client";

import { useState } from "react";
import { CONTAS_ORIGEM } from "@/lib/dados";

// Demanda 269 — lançamento manual de entrada avulsa (depósito, recebimento
// que não é venda de produto), direto da tela Entradas, sem precisar passar
// por pendência de conciliação. Reaproveita `criarEntradaAvulsa`
// (lib/supabase-admin.ts, já existia desde a 226/229) via a rota nova
// `POST /api/entradas-avulsas` — mesmo mecanismo que a classificação de
// pendência (`acao: 'entrada'`) já usa, só que chamado direto.
// Demanda 271 — mesmo modal ganhou modo de edição/cancelamento (`entradaExistente`),
// reaproveitando os mesmos campos em vez de duplicar um componente quase
// idêntico — só troca POST por PATCH e ganha o botão de excluir.

export interface EntradaAvulsaExistente {
  id: string;
  valor: number;
  contaDestino: string;
  descricao: string;
  dataDia: string;
}

// Mesma conversão DD-MM-AA <-> AAAA-MM-DD de TelaEntradas.tsx/TelaConciliacao.tsx.
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

export function ModalAdicionarEntrada({ operador, dataDiaDefault, entradaExistente, onFechar, onAdicionada }: {
  operador: string;
  dataDiaDefault: string;
  entradaExistente?: EntradaAvulsaExistente;
  onFechar: () => void;
  onAdicionada: () => void;
}) {
  const editando = !!entradaExistente;
  const [contaDestino, setContaDestino] = useState(entradaExistente?.contaDestino ?? "");
  const [valor, setValor] = useState(entradaExistente ? String(entradaExistente.valor) : "");
  const [descricao, setDescricao] = useState(entradaExistente?.descricao ?? "");
  const [dataDia, setDataDia] = useState(entradaExistente?.dataDia ?? dataDiaDefault);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (!contaDestino) { setErro("Escolha a conta de destino."); return; }
    const valorNum = Number(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) { setErro("Informe um valor válido."); return; }

    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/entradas-avulsas", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editando ? { id: entradaExistente!.id } : {}),
          contaDestino, valor: valorNum, descricao: descricao || undefined,
          operador, dataDia,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setErro(data.error || `Erro ao ${editando ? "editar" : "adicionar"} entrada.`); return; }
      onAdicionada();
    } catch {
      setErro(`Erro ao ${editando ? "editar" : "adicionar"} entrada.`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!entradaExistente) return;
    if (!confirm("Cancelar esta entrada? Ela sai da lista e do total do dia, sem deixar rastro.")) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/entradas-avulsas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entradaExistente.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setErro(data.error || "Erro ao cancelar entrada."); return; }
      onAdicionada();
    } catch {
      setErro("Erro ao cancelar entrada.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[28rem] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-base mb-1">{editando ? "Editar entrada" : "+ Adicionar entrada"}</h3>
        <p className="text-xs text-gray-500 mb-4">
          {editando
            ? "Corrige valor/conta/descrição/data de uma entrada avulsa já lançada."
            : "Depósito ou recebimento que não veio de venda de produto/pedido — lança direto, sem precisar de pendência."}
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Conta de destino</label>
            <div className="grid grid-cols-2 gap-2">
              {CONTAS_ORIGEM.map(c => (
                <button key={c.id} onClick={() => setContaDestino(c.id)}
                  className={`text-sm font-medium rounded-lg py-2 px-2 border-2 transition-colors ${
                    contaDestino === c.id ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Valor</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex.: depósito combinando caixa de Zu e Gabi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data</label>
            <input type="date" value={dataDia ? isoDeDataDia(dataDia) : ""}
              onChange={e => setDataDia(e.target.value ? dataDiaDeIso(e.target.value) : dataDiaDefault)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
          </div>
        </div>

        {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">⚠️ {erro}</p>}

        <div className="flex gap-2 mb-3">
          <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando}
            className="flex-1 bg-teal-700 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-teal-800 disabled:opacity-50">
            {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
          </button>
        </div>

        {editando && (
          <button onClick={excluir} disabled={salvando} className="w-full text-xs text-gray-400 hover:text-red-500">
            🗑️ Cancelar esta entrada (excluir)
          </button>
        )}
      </div>
    </div>
  );
}
