"use client";

import { useEffect } from "react";

// Demanda 334 (incidente ao vivo, 2026-08-27): sessão caindo no meio do uso
// (cookie invalidado/expirado) fazia cada tela consumir seu próprio 401 em
// silêncio — o Inbox parava de atualizar, "Clientes" ficava vazio, sem
// nenhum aviso, parecendo falta de dado real em vez de sessão caída.
// Este hook intercepta QUALQUER resposta 401 de uma rota /api/ (fora as de
// autenticação, que legitimamente respondem 401 em caso de senha errada) e
// força a volta pra tela de login — não corrige a causa da sessão cair, mas
// garante que o sintoma nunca mais é "tela vazia sem explicação".
export function useDeslogarEm401(aoDeslogar: () => void) {
  useEffect(() => {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetchOriginal(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (res.status === 401 && url.includes("/api/") && !url.includes("/api/auth/")) {
        aoDeslogar();
      }
      return res;
    }) as typeof window.fetch;
    return () => { window.fetch = fetchOriginal; };
  }, [aoDeslogar]);
}
