"use client";

import { useState, useEffect } from "react";
import { CONTAS_ORIGEM } from "@/lib/dados";

// Demanda 229 — modal de classificação, compartilhado pelo card "Itens não
// explicados hoje" (TelaFechamento.tsx) e pela aba "🔎 Conciliação"
// (TelaConciliacao.tsx). Cada pendência vem das demandas 227 (matching de
// pagamento do Mercado Pago) ou 228 (gap agregado de saldo) — nunca vincula/
// classifica nada sozinho, sempre uma ação explícita do Admin aqui.
export interface PendenciaConciliacao {
  id: string;
  conta: string;
  data_dia: string;
  tipo_origem: "mercadopago_pagamento" | "saldo_dia_agregado";
  valor: number;
  origem_externa_id: string | null;
  descricao_sugerida: string | null;
  status: "pendente" | "classificado" | "ignorado";
}

interface CategoriaSaida { id: string; nome: string; }

const LABEL_CONTA: Record<string, string> = Object.fromEntries(CONTAS_ORIGEM.map(c => [c.id, c.label]));
// Demanda 230 (Edvam pediu linguagem simples, sem fórmula/jargão): rótulos
// mais diretos — o texto completo em `descricao_sugerida` já explica o
// resto, esse rótulo é só uma etiqueta curta de contexto.
const LABEL_TIPO_ORIGEM: Record<string, string> = {
  mercadopago_pagamento: "Pagamento não identificado",
  saldo_dia_agregado: "Saldo sem explicação",
};

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Acao = "entrada" | "saida" | "transferencia" | "sabido";

export function ModalClassificarPendencia({ pendencia, operador, onFechar, onClassificado }: {
  pendencia: PendenciaConciliacao;
  operador: string;
  onFechar: () => void;
  onClassificado: () => void;
}) {
  const [acao, setAcao] = useState<Acao | null>(null);
  const [valor, setValor] = useState(String(Math.abs(pendencia.valor)));
  const [descricao, setDescricao] = useState(pendencia.descricao_sugerida ?? "");
  const [categorias, setCategorias] = useState<CategoriaSaida[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [contaContraparte, setContaContraparte] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (acao !== "saida" || categorias.length > 0) return;
    fetch("/api/categorias-saida").then(r => r.json()).then(d => setCategorias(d.categorias ?? []));
  }, [acao, categorias.length]);

  // Demanda 229 (desenho): o sinal do valor decide a direção da
  // transferência — pendência positiva = dinheiro CHEGOU nessa conta (ela é
  // destino, escolhe de onde veio); negativa = dinheiro SAIU (ela é origem,
  // escolhe pra onde foi).
  const ehEntradaNaConta = pendencia.valor >= 0;
  const contasContraparteDisponiveis = CONTAS_ORIGEM.filter(c => c.id !== pendencia.conta);

  async function classificar(body: Record<string, unknown>) {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/conciliacao/pendencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendencia.id, operador, ...body }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setErro(data.error || "Erro ao classificar."); return; }
      onClassificado();
    } catch {
      setErro("Erro ao classificar.");
    } finally {
      setSalvando(false);
    }
  }

  function confirmar() {
    if (acao === "entrada") {
      classificar({ acao: "entrada", valor: Number(valor.replace(",", ".")), descricao: descricao || undefined });
    } else if (acao === "saida") {
      if (!categoriaId) { setErro("Escolha uma categoria."); return; }
      classificar({ acao: "saida", categoriaId, valor: Number(valor.replace(",", ".")), descricao: descricao || undefined });
    } else if (acao === "transferencia") {
      if (!contaContraparte) { setErro("Escolha a conta contraparte."); return; }
      classificar({ acao: "transferencia", contaContraparte, descricao: descricao || undefined });
    } else if (acao === "sabido") {
      if (!motivo.trim()) { setErro("Descreva o motivo."); return; }
      classificar({ acao: "sabido", motivo });
    }
  }

  function ignorar() {
    if (!confirm("Ignorar esta pendência? Ela sai da lista, sem gerar nenhum registro financeiro.")) return;
    classificar({ acao: "ignorar" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[28rem] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-base mb-1">Classificar pendência</h3>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <div className="flex justify-between items-baseline">
            <span className="font-semibold text-gray-700">{LABEL_CONTA[pendencia.conta] ?? pendencia.conta}</span>
            <span className={`font-bold ${pendencia.valor >= 0 ? "text-green-700" : "text-red-600"}`}>
              {pendencia.valor >= 0 ? "+" : ""}{moeda(pendencia.valor)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{pendencia.data_dia} · {LABEL_TIPO_ORIGEM[pendencia.tipo_origem]}</p>
          {pendencia.descricao_sugerida && (
            <p className="text-xs text-gray-400 mt-1">{pendencia.descricao_sugerida}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {([
            ["entrada", "💰 Entrada"], ["saida", "💸 Saída"],
            ["transferencia", "🔁 Transferência"], ["sabido", "🤷 Sabido, não é real"],
          ] as [Acao, string][]).map(([opcao, rotulo]) => (
            <button key={opcao} onClick={() => { setAcao(opcao); setErro(null); }}
              className={`text-sm font-medium rounded-lg py-2.5 px-2 border-2 transition-colors ${
                acao === opcao ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              {rotulo}
            </button>
          ))}
        </div>

        {acao === "entrada" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valor</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <p className="text-xs text-gray-400">Entra como entrada avulsa em {LABEL_CONTA[pendencia.conta] ?? pendencia.conta}.</p>
          </div>
        )}

        {acao === "saida" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valor</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <p className="text-xs text-gray-400">Sai de {LABEL_CONTA[pendencia.conta] ?? pendencia.conta}.</p>
          </div>
        )}

        {acao === "transferencia" && (
          <div className="space-y-3 mb-4">
            <p className="text-xs text-gray-500">
              {ehEntradaNaConta
                ? `Esse dinheiro chegou em ${LABEL_CONTA[pendencia.conta] ?? pendencia.conta} — de qual conta ele veio?`
                : `Esse dinheiro saiu de ${LABEL_CONTA[pendencia.conta] ?? pendencia.conta} — pra qual conta ele foi?`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {contasContraparteDisponiveis.map(c => (
                <button key={c.id} onClick={() => setContaContraparte(c.id)}
                  className={`text-sm font-medium rounded-lg py-2 px-2 border-2 transition-colors ${
                    contaContraparte === c.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
        )}

        {acao === "sabido" && (
          <div className="space-y-3 mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Motivo (obrigatório)</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
              placeholder="Ex.: Pix pessoal do Edvam que caiu por engano na conta da empresa."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            <p className="text-xs text-gray-400">Não cria nenhum registro financeiro — só marca como resolvido, com o motivo guardado.</p>
          </div>
        )}

        {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">⚠️ {erro}</p>}

        <div className="flex gap-2 mb-3">
          <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={!acao || salvando}
            className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
            {salvando ? "Salvando..." : "Confirmar"}
          </button>
        </div>
        <button onClick={ignorar} disabled={salvando} className="w-full text-xs text-gray-400 hover:text-red-500">
          🚫 Ignorar esta pendência (sem classificar)
        </button>
      </div>
    </div>
  );
}
