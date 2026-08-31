"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type Usuario } from "@/lib/usuarios";
import { DiagnosticoFechamento } from "@/components/DiagnosticoFechamento";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { ModalClassificarPendencia, type PendenciaConciliacao } from "@/components/ModalClassificarPendencia";

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface BucketFormaPagamento {
  forma: string;
  bruto: number;
  taxaPct: number;
  taxaValor: number;
  liquido: number;
  contaNome: string | null;
}

interface FechamentoOperador {
  operador: string;
  fechou: boolean;
  dinheiro: number;
  moedas: number;
  fechadoEm: string | null;
}

interface DiaHistorico {
  data_dia: string;
  fechado_por: string | null;
  total_entradas: number;
  total_saidas: number;
  saldo_acumulado: number;
  divergencia: number;
  fechado_em: string;
}

interface DadosFechamento {
  nomeAba: string;
  totalEntradas: number;
  totalSaidas: number;
  resultadoDia: number;
  saldoAcumulado: number;
  porFormaPagamento: { buckets: BucketFormaPagamento[]; totalLiquido: number } | null;
  // Demanda 099: selo aberto/fechado + histórico — só vêm preenchidos na
  // visão geral do admin (sem `operador` na chamada), nunca no fechamento
  // por operador.
  fechadoHoje?: boolean;
  fechadoEmHoje?: string | null;
  historico?: DiaHistorico[];
  // Demanda 121: dinheiro/moedas reais que Zu/Gabi já fecharam hoje.
  fechamentosOperadores?: FechamentoOperador[];
  // Demanda 127: líquido recebido hoje na conta Mercado Pago (automático,
  // integração da 084) — null quando a integração falhou (a tela abre o
  // campo pra preenchimento manual em vez de travar o fechamento).
  saldoMercadoPago?: number | null;
}

export function TelaFechamento({ operador, onAbrirConciliacao }: {
  operador: Usuario;
  // Demanda 229: link do card "Itens não explicados hoje" pra aba
  // "🔎 Conciliação" (mesmo padrão de `onAbrirContasPagarReceber` em
  // TelaSaidas) — sem a prop, o link simplesmente não aparece.
  onAbrirConciliacao?: () => void;
}) {
  const isAdmin = operador.papel === "admin";

  const [dados, setDados]         = useState<DadosFechamento | null>(null);
  const [resumo, setResumo]       = useState<{ nome: string; entradas: number; saidas: number }[]>([]);
  // Demanda 229: pendências de conciliação (227/228) do dia sendo fechado —
  // só Admin, não trava o botão "Fechar Caixa".
  const [pendenciasHoje, setPendenciasHoje] = useState<PendenciaConciliacao[]>([]);
  const [classificando, setClassificando] = useState<PendenciaConciliacao | null>(null);
  // Demanda 127: o campo único "Bancos" virou 4 contas nomeadas. Mercado
  // Pago é automático (vem em `dados.saldoMercadoPago`); `mpManual` só é
  // usado quando a integração falhou (null). As outras 3 são manuais.
  const [mpManual, setMpManual]             = useState("");
  const [caixaEconomica, setCaixaEconomica] = useState("");
  const [stone, setStone]                   = useState("");
  const [recargaPay, setRecargaPay]         = useState("");
  const [dinheiro, setDinheiro]   = useState("");
  const [moedas, setMoedas]       = useState("");
  const [resultado, setResultado] = useState<{ divergencia: number; fechadoEm: string } | null>(null);
  const [erroFechamento, setErroFechamento] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  // Demanda 158: "Como funciona" virou colapsável, fechado por padrão — a
  // explicação (026) continua inteira pra quem precisa, sem ocupar o topo
  // pra quem fecha o caixa todo dia.
  const [mostrarComoFunciona, setMostrarComoFunciona] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const jaPreencheuContagem = useRef(false);

  const carregarDados = useCallback(async () => {
    const param = isAdmin ? "" : `?operador=${encodeURIComponent(operador.nome)}`;
    try {
      const r = await fetch(`/api/fechamento${param}`);
      const d = await r.json();
      setDados(d);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, [operador.nome, isAdmin]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  // Demanda 136: a aba não desmonta mais ao trocar — os números (resumo,
  // saldo esperado, gavetas) recarregam quando a aba volta a ficar visível.
  const [tickReativa, setTickReativa] = useState(0);
  useRecarregarAoReativar(() => { carregarDados(); setTickReativa(t => t + 1); });

  // Demanda 229: pendências de conciliação do dia — só depois que `dados`
  // trouxer `nomeAba` (o data_dia real do dia-caixa atual).
  const carregarPendenciasHoje = useCallback(async (dataDia: string) => {
    try {
      const r = await fetch(`/api/conciliacao/pendencias?dataDia=${encodeURIComponent(dataDia)}`);
      const d = await r.json();
      setPendenciasHoje((d.pendencias ?? []).filter((p: PendenciaConciliacao) => p.status === "pendente"));
    } catch { /* silencioso — card só não aparece */ }
  }, []);
  useEffect(() => {
    if (isAdmin && dados?.nomeAba) carregarPendenciasHoje(dados.nomeAba);
  }, [isAdmin, dados?.nomeAba, tickReativa, carregarPendenciasHoje]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all(["Edvam", "Zu", "Gabi"].map(nome =>
      fetch(`/api/fechamento?operador=${nome}`)
        .then(r => r.json())
        // Demanda 099: já vinha totalSaidas nessa mesma resposta (achado
        // 080/074), só não estava sendo capturado — sem chamada nova.
        .then(d => ({ nome, entradas: d.totalEntradas || 0, saidas: d.totalSaidas || 0 }))
    )).then(setResumo);
  }, [isAdmin, tickReativa]);

  // Demanda 121: pré-preenche "Dinheiro em cédulas"/"Moedas" da Contagem
  // física geral com a soma do que Zu/Gabi já fecharam de verdade — só uma
  // vez (ao carregar), pra não sobrescrever um ajuste manual do Admin depois.
  useEffect(() => {
    if (!isAdmin || jaPreencheuContagem.current || !dados?.fechamentosOperadores) return;
    const fechados = dados.fechamentosOperadores.filter(f => f.fechou);
    if (fechados.length === 0) return;
    const somaDinheiro = fechados.reduce((acc, f) => acc + f.dinheiro, 0);
    const somaMoedas   = fechados.reduce((acc, f) => acc + f.moedas, 0);
    setDinheiro(String(somaDinheiro));
    setMoedas(String(somaMoedas));
    jaPreencheuContagem.current = true;
  }, [isAdmin, dados]);

  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

  // Demanda 127: Mercado Pago automático (integração 084); se a integração
  // falhou (null), vale o que o Admin digitou no campo manual de fallback.
  const mpAutomatico = isAdmin ? (dados?.saldoMercadoPago ?? null) : null;
  const valorMercadoPago = mpAutomatico ?? num(mpManual);

  const totalFisico =
    (isAdmin ? valorMercadoPago + num(caixaEconomica) + num(stone) + num(recargaPay) : 0) +
    num(dinheiro) +
    num(moedas);

  const saldoEsperado = dados?.saldoAcumulado ?? 0;
  const divergencia   = totalFisico - saldoEsperado;

  async function fecharCaixa() {
    setLoading(true);
    setErroFechamento(null);
    try {
      const res = await fetch("/api/fechamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Demanda 127: as 4 contas separadas (só no fechamento geral do
          // admin) — o servidor soma e grava `bancos` consolidado junto.
          ...(isAdmin ? {
            saldoMercadoPago:    valorMercadoPago,
            saldoCaixaEconomica: num(caixaEconomica),
            saldoStone:          num(stone),
            saldoRecargapay:     num(recargaPay),
          } : { bancos: 0 }),
          dinheiro: num(dinheiro),
          moedas:   num(moedas),
          // Demanda 092: fechamento geral (representa o dia inteiro, vira a
          // base do saldo de amanhã) precisa ser distinto do fechamento
          // pessoal de cada operador — só o admin faz o fechamento geral
          // (sem `operador`, grava `fechado_por: 'Sistema'`); Zu/Gabi
          // fecham só a própria gaveta física.
          operador: isAdmin ? undefined : operador.nome,
        }),
      });
      const data = await res.json();
      // Achado do PM (2026-07-06, aconteceu de verdade com o Edvam): a API pode
      // responder com erro (ex. conflito de constraint) — sem checar isso, o
      // resultado virava "R$ NaN... Fechado às Invalid Date" em vez de avisar
      // que o fechamento não foi salvo.
      if (!res.ok || data.error) {
        setErroFechamento(data.error || "Erro ao fechar caixa, tente de novo ou chame o suporte.");
        return;
      }
      setResultado(data);
    } catch {
      setErroFechamento("Erro ao fechar caixa, tente de novo ou chame o suporte.");
    } finally { setLoading(false); }
  }

  if (carregando) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
      </svg>
      Carregando...
    </div>
  );

  if (resultado) {
    // Demanda 074 (feedback do Edvam, 2026-07-07): o fechamento é sempre
    // salvo, com ou sem divergência — a tela precisa deixar isso claro,
    // nunca parecer erro/falha quando só há diferença de contagem pra
    // conferir depois. Por isso o título e o ícone são sempre de sucesso; a
    // divergência (se houver) aparece como nota secundária, não como alarme.
    const zerado = Math.abs(resultado.divergencia) < 0.5;
    return (
      <div className="flex items-center justify-center h-full">
        <div className={`rounded-2xl p-10 text-center max-w-sm w-full mx-4 border-2 ${zerado ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-1 text-gray-800">Fechamento salvo!</h2>
          <p className="text-sm text-gray-500 mb-3">Caixa de <strong>{operador.nome}</strong></p>
          {zerado ? (
            <p className="text-green-700 font-medium text-sm">✓ Contagem bateu certinho, sem diferença.</p>
          ) : (
            <p className="text-amber-700 font-medium text-sm">
              Diferença de {moeda(Math.abs(resultado.divergencia))} {resultado.divergencia > 0 ? "a mais" : "a menos"} no
              físico contado — já foi registrada, confira quando puder.
            </p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Fechado às {new Date(resultado.fechadoEm).toLocaleTimeString("pt-BR")}
          </p>
        </div>
      </div>
    );
  }

  if (!dados) return <div className="flex items-center justify-center h-full text-red-500">Erro ao carregar dados.</div>;

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-700">Fechar Caixa</h2>
          <p className="text-sm text-gray-500">
            Caixa de <strong>{operador.nome}</strong> — {dados.nomeAba}
            {isAdmin && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Visão geral do dia</span>}
          </p>
        </div>
        {/* Selo aberto/fechado do dia (demanda 099) — só a visão geral do
            admin sabe se o fechamento geral de hoje já aconteceu. */}
        {isAdmin && (
          dados.fechadoHoje ? (
            <span className="text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              🟢 Fechado{dados.fechadoEmHoje ? ` às ${new Date(dados.fechadoEmHoje).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          ) : (
            <span className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              🟡 Ainda em aberto
            </span>
          )
        )}
      </div>

      {/* Demanda 229: pendências de conciliação (227/228) do dia — só
          visibilidade, nunca trava o fechamento (o Admin pode fechar com
          itens ainda pendentes, decisão explícita do desenho 225). */}
      {isAdmin && pendenciasHoje.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-amber-900 text-sm">
              🔍 Itens não explicados hoje ({pendenciasHoje.length})
            </h3>
            {onAbrirConciliacao && (
              <button onClick={onAbrirConciliacao} className="text-xs text-amber-700 hover:underline">
                Ver tela de Conciliação completa →
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {pendenciasHoje.map(p => (
              <div key={p.id} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600">{p.descricao_sugerida ?? p.tipo_origem}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold ${p.valor >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {p.valor >= 0 ? "+" : ""}{moeda(p.valor)}
                  </span>
                  <button onClick={() => setClassificando(p)}
                    className="text-xs bg-blue-700 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-800">
                    Classificar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Como funciona — ajuda contextual (demanda 026). Demanda 158: virou
          colapsável, fechado por padrão — texto idêntico ao de sempre. */}
      <div>
        <button
          onClick={() => setMostrarComoFunciona(v => !v)}
          className="text-sm text-blue-700 hover:underline"
        >
          ⓘ Como funciona isso? {mostrarComoFunciona ? "▲" : "▼"}
        </button>
        {mostrarComoFunciona && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 mt-2">
            <strong>Como funciona:</strong> o sistema calcula quanto deveria ter no caixa hoje
            ("{isAdmin ? "saldo acumulado" : "total esperado"}"). Conte o dinheiro e as moedas de
            verdade e informe abaixo. Se o valor contado bater com o esperado, a divergência fica
            em zero — tudo certo. Se não bater, o sistema mostra a diferença pra você conferir
            antes de fechar.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 items-start">

        {/* Contagem física — demanda 158: subiu pra PRIMEIRO bloco da
            página (era a coluna da direita): é a ação do dia, o Admin abre
            a tela já preenchendo, sem rolar. Nada de cálculo mudou. */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex-1 min-w-[280px]">
          <h3 className="font-bold text-gray-700 mb-4">Contagem física</h3>

          {/* Demanda 121: quanto Zu/Gabi já fecharam de verdade hoje —
              dinheiro/moedas pré-preenchem os campos abaixo, editável se a
              conferência física real não bater. */}
          {isAdmin && dados.fechamentosOperadores && dados.fechamentosOperadores.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 mb-4 text-xs">
              <h4 className="font-semibold text-blue-900 uppercase tracking-wide mb-2">
                Já fechado por operador hoje
              </h4>
              <div className="space-y-1.5">
                {dados.fechamentosOperadores.map(f => (
                  <div key={f.operador} className="flex justify-between items-center">
                    <span className="text-gray-600">{f.operador}</span>
                    {f.fechou ? (
                      <span className="font-semibold text-gray-800">
                        {moeda(f.dinheiro)} cédulas + {moeda(f.moedas)} moedas
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">ainda não fechou</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-bold text-blue-900">
                <span>Soma</span>
                <span>
                  {moeda(dados.fechamentosOperadores.reduce((a, f) => a + (f.fechou ? f.dinheiro : 0), 0))} cédulas + {" "}
                  {moeda(dados.fechamentosOperadores.reduce((a, f) => a + (f.fechou ? f.moedas : 0), 0))} moedas
                </span>
              </div>
              <p className="text-blue-700 mt-2">
                Já pré-preenchido nos campos abaixo — ajuste se a conferência física real for diferente.
              </p>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {/* Demanda 127: o campo único "Bancos" virou 4 contas nomeadas —
                a divergência de R$474,02 de 08/07 veio de somar 4 contas num
                campo só, sem rastreabilidade. Mercado Pago é automático
                (integração 084); as outras 3 são manuais, cada uma com nome. */}
            {isAdmin && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">💳 Mercado Pago</label>
                  {mpAutomatico !== null ? (
                    <>
                      <div className="w-full border border-green-200 bg-green-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-green-800">
                        {moeda(mpAutomatico)}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Recebido hoje na conta, já líquido de taxas — automático, sem digitar
                        (mesma fonte da tela 💳 Mercado Pago).
                      </p>
                    </>
                  ) : (
                    <>
                      <input type="number" placeholder="R$ 0,00" value={mpManual}
                        onChange={e => setMpManual(e.target.value)}
                        className="w-full border border-amber-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Integração indisponível agora — informe manualmente o recebido de hoje
                        no app do Mercado Pago.
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">🏦 Caixa Econômica</label>
                  <input type="number" placeholder="R$ 0,00" value={caixaEconomica}
                    onChange={e => setCaixaEconomica(e.target.value)}
                    title="Cédulas depositadas na Caixa Econômica hoje"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Cédulas depositadas hoje.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">💳 Stone</label>
                  <input type="number" placeholder="R$ 0,00" value={stone}
                    onChange={e => setStone(e.target.value)}
                    title="Recebido hoje na Stone (cartão)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Recebido hoje no cartão (Stone).</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">📱 RecargaPay</label>
                  <input type="number" placeholder="R$ 0,00" value={recargaPay}
                    onChange={e => setRecargaPay(e.target.value)}
                    title="Crédito na RecargaPay (recarga de VEM)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">Crédito pra recarga de VEM.</p>
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dinheiro em cédulas</label>
              <input type="number" placeholder="R$ 0,00" value={dinheiro}
                onChange={e => setDinheiro(e.target.value)}
                title="Some todas as cédulas no caixa e informe o total"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <p className="text-xs text-gray-400 mt-1">Conte as notas de dinheiro no caixa e informe o total.</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Moedas</label>
              <input type="number" placeholder="R$ 0,00" value={moedas}
                onChange={e => setMoedas(e.target.value)}
                title="Conte as moedas e informe o valor total"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <p className="text-xs text-gray-400 mt-1">Conte as moedas no caixa e informe o total.</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total físico contado</span>
              <span className="font-bold text-gray-800">{moeda(totalFisico)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold ${Math.abs(divergencia) < 0.5 ? "text-green-600" : "text-red-600"}`}>
              <span>Divergência</span>
              <span title="Diferença entre o físico contado e o total esperado pelo sistema">
                {Math.abs(divergencia) < 0.5 ? "✓ Zero" : `${divergencia > 0 ? "+" : ""}${moeda(divergencia)}`}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Divergência é a diferença entre o que você contou e o que o sistema esperava. Se
              não for zero, confira a contagem antes de fechar.
            </p>
          </div>
          {erroFechamento && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              ⚠️ {erroFechamento}
            </p>
          )}
          <button onClick={fecharCaixa} disabled={loading}
            title={`Registra o fechamento de caixa de ${operador.nome} para o dia de hoje`}
            className="w-full bg-blue-700 text-white rounded-lg py-3 font-bold hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 transition-colors">
            {loading ? "Fechando..." : `🔒 Fechar Caixa — ${operador.nome}`}
          </button>
        </div>
        {/* Demanda 132: "Resumo" + "Histórico dos últimos dias" viram UMA
            coluna (item único do flex) ao lado da "Contagem física", que é
            bem mais alta — antes o Resumo ficava curto com um vazio enorme
            embaixo e o Histórico solto lá embaixo ocupando a largura toda.
            Demanda 158: a coluna passou pra DEPOIS da Contagem (a contagem é
            a ação do dia; em tela estreita, o wrap põe a contagem em cima).
            Pro operador (Zu/Gabi) a coluna só tem o "Seu resumo hoje"
            (Histórico é só-Admin, condição preservada da 099) — visual
            idêntico ao de antes pra elas. */}
        <div className="flex-1 min-w-[280px] flex flex-col gap-4">

        {/* Resumo do dia — Entradas e Saídas lado a lado, no topo (feedback
            do Edvam, 2026-07-07): antes ficava tudo empilhado, difícil de
            escanear rápido. */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-700 mb-4">
            {isAdmin ? "Resumo geral" : "Seu resumo hoje"}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-700 font-medium mb-1">
                + Entradas{!isAdmin ? " (dinheiro)" : ""}
              </div>
              <div className="text-lg font-bold text-green-700">{moeda(dados.totalEntradas)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-700 font-medium mb-1">− Saídas</div>
              <div className="text-lg font-bold text-red-700">{moeda(dados.totalSaidas)}</div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
            <span className="font-bold text-gray-800 text-sm">
              {isAdmin ? "Saldo acumulado" : "Total esperado"}
            </span>
            <span className="font-bold text-blue-700 text-xl">{moeda(saldoEsperado)}</span>
          </div>
          {!isAdmin && (
            <p className="text-xs text-gray-400 mt-2">
              Abertura de hoje + dinheiro recebido − saídas pagas por você.
            </p>
          )}
        </div>

        {/* Histórico dos últimos dias (demanda 099) — só fechamento geral,
            exclui por operador (mesmo filtro `ehFechamentoGeral` da 092/075).
            Demanda 132: movido pra cá, logo abaixo do Resumo geral, na mesma
            coluna — conteúdo idêntico, só reposicionado. */}
        {isAdmin && dados.historico && dados.historico.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-700 mb-4">Histórico dos últimos dias</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2">Dia</th>
                  <th className="py-2 text-right">Entradas</th>
                  <th className="py-2 text-right">Saídas</th>
                  <th className="py-2 text-right">Saldo acumulado</th>
                  <th className="py-2 text-right">Divergência</th>
                </tr>
              </thead>
              <tbody>
                {dados.historico.map(dia => (
                  <tr key={dia.data_dia} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-800">{dia.data_dia}</td>
                    <td className="py-2 text-right text-green-700">{moeda(dia.total_entradas)}</td>
                    <td className="py-2 text-right text-red-600">{moeda(dia.total_saidas)}</td>
                    <td className="py-2 text-right font-semibold text-gray-800">{moeda(dia.saldo_acumulado)}</td>
                    <td className={`py-2 text-right font-semibold ${Math.abs(dia.divergencia) < 0.5 ? "text-green-600" : "text-amber-600"}`}>
                      {Math.abs(dia.divergencia) < 0.5 ? "✓ Zero" : `${dia.divergencia > 0 ? "+" : ""}${moeda(dia.divergencia)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        </div>

      </div>

      {/* Admin: resumo por operador — entradas E saídas (demanda 099;
          antes só mostrava entradas). Demanda 158: desceu pra depois da
          Contagem física — contexto secundário, não a ação do dia. */}
      {isAdmin && resumo.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por operador hoje</h3>
          <div className="grid grid-cols-3 gap-3">
            {resumo.map(r => (
              <div key={r.nome} className="text-center bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1.5">{r.nome}</div>
                <div className="text-sm font-bold text-green-700">+ {moeda(r.entradas)}</div>
                <div className="text-sm font-bold text-red-600">− {moeda(r.saidas)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Total geral</span>
            <span className="font-bold">
              <span className="text-green-700">+ {moeda(resumo.reduce((a, r) => a + r.entradas, 0))}</span>
              {" "}
              <span className="text-red-600">− {moeda(resumo.reduce((a, r) => a + r.saidas, 0))}</span>
            </span>
          </div>
        </div>
      )}

      {/* Discriminação por forma de pagamento (demanda 077) */}
      {isAdmin && dados.porFormaPagamento && dados.porFormaPagamento.buckets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-700 mb-1">Discriminação por forma de pagamento</h3>
          <p className="text-xs text-gray-400 mb-4">
            Já descontando a taxa da conta configurada como padrão pra cartão/Pix — use pra
            conferir o valor líquido esperado em cada conta bancária.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="py-2">Forma</th>
                <th className="py-2">Conta</th>
                <th className="py-2 text-right">Bruto</th>
                <th className="py-2 text-right">Taxa</th>
                <th className="py-2 text-right">Líquido esperado</th>
              </tr>
            </thead>
            <tbody>
              {dados.porFormaPagamento.buckets.map(b => (
                <tr key={b.forma} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-800">{b.forma}</td>
                  <td className="py-2 text-gray-500">{b.contaNome ?? "—"}</td>
                  <td className="py-2 text-right text-gray-700">{moeda(b.bruto)}</td>
                  <td className="py-2 text-right text-red-500">
                    {b.taxaValor > 0 ? `− ${moeda(b.taxaValor)} (${b.taxaPct}%)` : "—"}
                  </td>
                  <td className="py-2 text-right font-semibold text-gray-800">{moeda(b.liquido)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={4} className="py-2 font-bold text-gray-700">Total líquido esperado</td>
                <td className="py-2 text-right font-bold text-blue-700">{moeda(dados.porFormaPagamento.totalLiquido)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Demanda 153 (Camada D, última do diagnóstico 149-153): resumo do
          dia por IA (editável) + sinais das regras automáticas, com seletor
          de data — só Admin, como o Histórico (099/132). */}
      {isAdmin && <DiagnosticoFechamento />}

      {classificando && (
        <ModalClassificarPendencia
          pendencia={classificando}
          operador={operador.nome}
          onFechar={() => setClassificando(null)}
          onClassificado={() => { setClassificando(null); if (dados?.nomeAba) carregarPendenciasHoje(dados.nomeAba); }}
        />
      )}
    </div>
  );
}
