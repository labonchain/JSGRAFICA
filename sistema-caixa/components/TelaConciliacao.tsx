"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { CONTAS_ORIGEM } from "@/lib/dados";
import { ModalClassificarPendencia, type PendenciaConciliacao } from "@/components/ModalClassificarPendencia";
import { ModalRecalculoFechamento } from "@/components/ModalRecalculoFechamento";

// Demanda 229 — tela "🔎 Conciliação": TODAS as pendências de qualquer dia
// (jsgrafica_conciliacao_pendencias, alimentada pelas 227/228 desde 21/07) +
// histórico do que já foi classificado/ignorado. Mesmo modal de
// classificação do card "Itens não explicados hoje" (TelaFechamento.tsx).

const LABEL_CONTA: Record<string, string> = Object.fromEntries(CONTAS_ORIGEM.map(c => [c.id, c.label]));
// Demanda 230: rótulos mais diretos, mesma escolha da ModalClassificarPendencia.tsx.
const LABEL_TIPO_ORIGEM: Record<string, string> = {
  mercadopago_pagamento: "Pagamento não identificado",
  saldo_dia_agregado: "Saldo sem explicação",
};

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type FiltroStatus = "pendente" | "classificado" | "ignorado" | "todos";

// GET /api/conciliacao/pendencias devolve a pendência + campos calculados
// que o modal de classificação (ModalClassificarPendencia) não precisa
// conhecer (ele só lê/grava, não lista histórico).
interface PendenciaComExtras extends PendenciaConciliacao {
  classificacao: { tipo?: string; [key: string]: unknown } | null;
  classificado_por: string | null;
  fechamentoDesatualizado: boolean;
}

export function TelaConciliacao({ operador }: { operador: string }) {
  const [pendencias, setPendencias] = useState<PendenciaComExtras[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("pendente");
  const [filtroDia, setFiltroDia] = useState(""); // vazio = todos os dias
  const [classificando, setClassificando] = useState<PendenciaConciliacao | null>(null);
  const [mostrarRecalculo, setMostrarRecalculo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (filtroDia) params.set("dataDia", filtroDia);
      const res = await fetch(`/api/conciliacao/pendencias?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar pendências");
      setPendencias(data.pendencias ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar pendências");
    } finally {
      setCarregando(false);
    }
  }, [filtroDia]);

  useEffect(() => { carregar(); }, [carregar]);
  useRecarregarAoReativar(carregar);

  const filtradas = pendencias.filter(p => filtroStatus === "todos" || p.status === filtroStatus);
  const totalPendentes = pendencias.filter(p => p.status === "pendente").length;
  const diasDesatualizados = [...new Set(pendencias.filter(p => p.fechamentoDesatualizado).map(p => p.data_dia))];

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-700">🔎 Conciliação</h2>
        <p className="text-sm text-gray-500">
          Pagamentos do Mercado Pago sem vínculo (227) e diferenças de saldo agregadas (228) — classifique
          ou ignore cada item.
        </p>
      </div>

      {/* Demanda 231: banner de nível-dia, agrupando o que antes só aparecia
          item a item — ponto de entrada pra prévia/aplicar do recálculo. */}
      {diasDesatualizados.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">
            🔴 {diasDesatualizados.length} dia(s) com fechamento desatualizado ({diasDesatualizados.join(", ")}) —
            precisa recalcular.
          </p>
          <button onClick={() => setMostrarRecalculo(true)}
            className="bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-800 whitespace-nowrap">
            Ver prévia do recálculo
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["pendente", "classificado", "ignorado", "todos"] as FiltroStatus[]).map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}>
            {s === "pendente" ? `Pendentes${totalPendentes > 0 ? ` (${totalPendentes})` : ""}` : s === "classificado" ? "Classificados" : s === "ignorado" ? "Ignorados" : "Todos"}
          </button>
        ))}
        <input type="date" value={filtroDia ? isoDeDataDia(filtroDia) : ""}
          onChange={e => setFiltroDia(e.target.value ? dataDiaDeIso(e.target.value) : "")}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white ml-auto" />
        {filtroDia && (
          <button onClick={() => setFiltroDia("")} className="text-xs text-gray-400 hover:text-gray-600">
            Ver todos os dias
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {carregando ? (
          <p className="text-sm text-gray-300 text-center py-6">Carregando...</p>
        ) : filtradas.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-6">Nenhuma pendência encontrada com esse filtro</p>
        ) : (
          <div className="space-y-2">
            {filtradas.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {LABEL_CONTA[p.conta] ?? p.conta} · {p.data_dia}
                    </p>
                    <p className="text-xs text-gray-500">{LABEL_TIPO_ORIGEM[p.tipo_origem] ?? p.tipo_origem}</p>
                    {p.descricao_sugerida && <p className="text-xs text-gray-400 mt-0.5">{p.descricao_sugerida}</p>}
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${p.valor >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {p.valor >= 0 ? "+" : ""}{moeda(p.valor)}
                  </span>
                </div>

                {p.status === "pendente" && (
                  <button onClick={() => setClassificando(p)}
                    className="mt-2 bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-800">
                    Classificar
                  </button>
                )}
                {p.status === "classificado" && (
                  <p className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1 inline-block">
                    ✓ Classificado como {rotuloClassificacao(p)} — por {p.classificado_por}
                  </p>
                )}
                {p.status === "ignorado" && (
                  <p className="mt-2 text-xs text-gray-400 bg-gray-100 rounded px-2 py-1 inline-block">
                    🚫 Ignorado por {p.classificado_por}
                  </p>
                )}
                {/* Demanda 229 (escopo original): aviso quando a classificação
                    afetou um data_dia cujo fechamento "Sistema" já tinha sido
                    fechado ANTES. Demanda 231: mecanismo de recálculo em si
                    (banner de nível-dia acima, com prévia/aplicar). */}
                {p.fechamentoDesatualizado && (
                  <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                    🔴 O fechamento de {p.data_dia} já estava fechado quando isso foi classificado —
                    ficou desatualizado, precisa recalcular.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {classificando && (
        <ModalClassificarPendencia
          pendencia={classificando}
          operador={operador}
          onFechar={() => setClassificando(null)}
          onClassificado={() => { setClassificando(null); carregar(); }}
        />
      )}

      {mostrarRecalculo && (
        <ModalRecalculoFechamento
          onFechar={() => setMostrarRecalculo(false)}
          onAplicado={carregar}
        />
      )}
    </div>
  );
}

function rotuloClassificacao(p: PendenciaComExtras): string {
  const tipo = p.classificacao?.tipo;
  if (tipo === "entrada") return "Entrada";
  if (tipo === "saida") return "Saída";
  if (tipo === "transferencia") return "Transferência";
  if (tipo === "sabido") return "Sabido, não é real";
  return "—";
}

// Mesma conversão DD-MM-AA <-> AAAA-MM-DD já usada em TelaEntradas.tsx.
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
