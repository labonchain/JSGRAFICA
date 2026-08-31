"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

// ── Demanda 136: sistema de abas deixou de DESMONTAR as telas ──
// Causa raiz do travamento de ~25s do Inbox: `{aba === "x" && <Tela/>}`
// destruía e recriava a tela a cada troca — a conexão Supabase Realtime do
// Inbox era encerrada (cleanup não aguardado) e a nova colidia com a antiga,
// caindo no timeout de join (10s) + backoff de reconexão da realtime-js.
// Padrão novo (mesmo de Slack/WhatsApp Web/Discord): a tela monta na PRIMEIRA
// visita e depois só alterna visibilidade (display:none) — conexão e estado
// ficam de pé, independente de qual aba está na frente.
//
// O contexto `AbaAtivaContext` + hook `useRecarregarAoReativar` resolvem o
// efeito colateral: tela que carregava dado fresco a cada montagem agora
// recarrega quando a aba VOLTA a ficar visível (não na primeira montagem) —
// mesmo frescor de antes, sem pagar a desmontagem.

const AbaAtivaContext = createContext(true);

export function AbaKeepAlive({ ativa, children }: { ativa: boolean; children: ReactNode }) {
  return (
    <AbaAtivaContext.Provider value={ativa}>
      <div className={ativa ? "h-full" : "hidden"}>{children}</div>
    </AbaAtivaContext.Provider>
  );
}

// Pra telas com dado sensível a tempo (Pedidos, Fechamento, Saídas, ...):
// dispara `recarregar` quando a aba reativa. Fora de um AbaKeepAlive o
// contexto é sempre `true` e o hook nunca dispara — seguro por padrão.
export function useRecarregarAoReativar(recarregar: () => void) {
  const ativa = useContext(AbaAtivaContext);
  const estavaAtiva = useRef(ativa);
  const fnRef = useRef(recarregar);
  useEffect(() => { fnRef.current = recarregar; }, [recarregar]);
  useEffect(() => {
    if (ativa && !estavaAtiva.current) fnRef.current();
    estavaAtiva.current = ativa;
  }, [ativa]);
}
