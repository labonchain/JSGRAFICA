"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { agoraRecife } from "@/lib/supabase";

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Demanda 194 — "Movimento" virou "📊 Visão Geral": os 3 relatórios nomeados
// (Fluxo de Caixa/Controle de Caixa/Relatório de Saídas, demanda 101) deixam
// de ser abas separadas e viram SEÇÕES de uma página só, reunidas — nenhum
// cálculo novo, tudo já vinha de `/api/dashboard` (que ganhou só o bloco
// `saudeCaixa`, agregando sinais que já existiam em outro lugar: panorama de
// pendentes da 175, estornos da 178, histórico de fechamento). Hierarquia
// visual pedida explicitamente pelo Edvam (2026-07-28): "Números do
// período" + "Saúde do caixa" primeiro e com destaque; o resto (formas de
// pagamento, produtos, saídas por categoria, fechamentos recentes) mais
// compacto, sem brigar por atenção.
type TipoPeriodo = "hoje" | "7dias" | "30dias" | "personalizado";
type OperadorFiltro = "todos" | "Edvam" | "Zu" | "Gabi";

interface TopProduto { nome: string; quantidade: number; valor: number }
interface DiaHistorico { aba: string; entradas: number; saidas: number; saldo: number; divergencia: number; fechadoPor: string | null }
interface SaudeCaixa {
  diasSemFechamento: string[];
  pendentes: { qtd: number; valor: number };
  estornados: { qtd: number; valor: number };
  divergenciaUltimos7: { soma: number; piorDia: { aba: string; divergencia: number } | null; dias: { aba: string; divergencia: number }[] };
}
interface DadosFinanceiro {
  historico: DiaHistorico[];
  porSemana: { label: string; entradas: number; saidas: number }[];
  saidasPorCategoria: { categoria: string; valor: number }[];
  entradasPorFormaPagamento: { forma: string; valor: number }[];
  topDias: DiaHistorico[];
  topProdutos: TopProduto[];
  resumo: { totalEntradas: number; totalSaidas: number; resultado: number; mediaDiaria: number; diasRegistrados: number; diasComMovimento: number; melhorDia: { aba: string; entradas: number } | null; itensVendidos: number };
  saudeCaixa: SaudeCaixa;
}

// Persiste a última escolha de período (pedido explícito do Edvam: "o
// sistema deveria lembrar a última escolha dele, não resetar pro mesmo
// default toda vez que abre a tela").
const CHAVE_PERIODO_SALVO = "jsgrafica-visao-geral-periodo";
interface PeriodoSalvo { tipo: TipoPeriodo; de?: string; ate?: string }

function ddmmaaaaParaAba(ddmmaaaa: string): string {
  const [dd, mm, aaaa] = ddmmaaaa.split("/");
  if (!dd || !mm || !aaaa) return "";
  return `${dd}-${mm}-${aaaa.slice(-2)}`;
}
function dataParaDDMMAAAA(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function abaLabel(aba: string) {
  const [dd, mm] = aba.split("-");
  return `${dd}/${mm}`;
}

export function TelaFinanceiro({ operadorFixo, onAbrirFechamento }: { operadorFixo?: string; onAbrirFechamento?: () => void } = {}) {
  const [dados, setDados] = useState<DadosFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("7dias");
  const [deCustom, setDeCustom] = useState("");
  const [ateCustom, setAteCustom] = useState("");
  const [operador, setOperador] = useState<OperadorFiltro>((operadorFixo as OperadorFiltro) ?? "todos");
  const jaCarregouPersistido = useRef(false);

  const buscar = useCallback(async (tipo: TipoPeriodo, op: OperadorFiltro, de?: string, ate?: string) => {
    setCarregando(true);
    try {
      let url: string;
      if (tipo === "hoje") {
        url = "/api/dashboard?periodo=hoje";
      } else if (tipo === "7dias" || tipo === "30dias") {
        const hoje = agoraRecife();
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - (tipo === "7dias" ? 6 : 29));
        url = `/api/dashboard?de=${ddmmaaaaParaAba(dataParaDDMMAAAA(inicio))}&ate=${ddmmaaaaParaAba(dataParaDDMMAAAA(hoje))}`;
      } else {
        const deAba = de ? ddmmaaaaParaAba(de) : "";
        const ateAba = ate ? ddmmaaaaParaAba(ate) : "";
        url = deAba && ateAba ? `/api/dashboard?de=${deAba}&ate=${ateAba}` : "/api/dashboard?periodo=7dias";
      }
      if (op !== "todos") url += `&operador=${encodeURIComponent(op)}`;
      const res = await fetch(url);
      const d = await res.json();
      setDados(d);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, []);

  // Carrega a última escolha salva (se houver) e busca com ela; senão, usa o
  // default ("7dias") já no estado inicial.
  useEffect(() => {
    if (jaCarregouPersistido.current) return;
    jaCarregouPersistido.current = true;
    try {
      const salvo = localStorage.getItem(CHAVE_PERIODO_SALVO);
      if (salvo) {
        const p: PeriodoSalvo = JSON.parse(salvo);
        setTipoPeriodo(p.tipo);
        if (p.de) setDeCustom(p.de);
        if (p.ate) setAteCustom(p.ate);
        buscar(p.tipo, operador, p.de, p.ate);
        return;
      }
    } catch { /* localStorage indisponível — segue com o default */ }
    buscar("7dias", operador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useRecarregarAoReativar(() => buscar(tipoPeriodo, operador, deCustom, ateCustom));

  function escolherPeriodo(tipo: TipoPeriodo) {
    setTipoPeriodo(tipo);
    if (tipo === "personalizado") return; // espera as 2 datas antes de buscar
    try { localStorage.setItem(CHAVE_PERIODO_SALVO, JSON.stringify({ tipo } as PeriodoSalvo)); } catch { /* ignorar */ }
    buscar(tipo, operador);
  }
  function aplicarPersonalizado() {
    if (!deCustom || !ateCustom) return;
    try { localStorage.setItem(CHAVE_PERIODO_SALVO, JSON.stringify({ tipo: "personalizado", de: deCustom, ate: ateCustom } as PeriodoSalvo)); } catch { /* ignorar */ }
    buscar("personalizado", operador, deCustom, ateCustom);
  }
  function trocarOperador(op: OperadorFiltro) {
    setOperador(op);
    buscar(tipoPeriodo, op, deCustom, ateCustom);
  }

  const presets: { id: TipoPeriodo; label: string }[] = [
    { id: "hoje", label: "Hoje" },
    { id: "7dias", label: "7 dias" },
    { id: "30dias", label: "30 dias" },
    { id: "personalizado", label: "Personalizado" },
  ];

  return (
    <div className="overflow-y-auto h-full bg-gray-50">
      <div className="p-5 space-y-5">

        {/* Header */}
        <div>
          <h2 className="text-base font-bold text-gray-700">📊 Visão Geral</h2>
          <p className="text-sm text-gray-500">Resumo do negócio — entradas, saídas, produtos e saúde do caixa.</p>
        </div>

        {/* Seletor de período + operador */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.id} onClick={() => escolherPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tipoPeriodo === p.id ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                }`}>{p.label}</button>
            ))}
          </div>
          {tipoPeriodo === "personalizado" && (
            <div className="flex items-center gap-2">
              <input type="text" placeholder="DD/MM/AAAA" value={deCustom}
                onChange={e => setDeCustom(e.target.value)}
                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white" />
              <span className="text-xs text-gray-400">até</span>
              <input type="text" placeholder="DD/MM/AAAA" value={ateCustom}
                onChange={e => setAteCustom(e.target.value)}
                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white" />
              <button onClick={aplicarPersonalizado} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                Visualizar
              </button>
            </div>
          )}
          {!operadorFixo && (
            <div className="flex flex-col gap-1 ml-auto">
              <label className="text-xs text-gray-400">Operador</label>
              <select value={operador} onChange={e => trocarOperador(e.target.value as OperadorFiltro)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400">
                <option value="todos">Todos</option>
                <option value="Edvam">Edvam</option>
                <option value="Zu">Zu</option>
                <option value="Gabi">Gabi</option>
              </select>
            </div>
          )}
        </div>

        {carregando || !dados ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            Buscando dados...
          </div>
        ) : (
          <>
            <NumerosDoPeriodo resumo={dados.resumo} />
            <SaudeDoCaixaSecao saude={dados.saudeCaixa} onAbrirFechamento={onAbrirFechamento} />

            {/* ── A partir daqui: consulta secundária, mais compacto de propósito ── */}
            <GraficoEntradasSaidas historico={dados.historico} />

            <div className="grid grid-cols-2 gap-4">
              <FormasDePagamento entradasPorFormaPagamento={dados.entradasPorFormaPagamento} />
              <SaidasPorCategoria saidasPorCategoria={dados.saidasPorCategoria} totalSaidas={dados.resumo.totalSaidas} />
            </div>

            <ProdutosMaisVendidos topProdutos={dados.topProdutos} />
            <FechamentosRecentes historico={dados.historico} operador={operador} onAbrirFechamento={onAbrirFechamento} />
          </>
        )}

      </div>
    </div>
  );
}

// ─── PRINCIPAL 1 — Números do período (cards grandes, primeira coisa que se vê) ──
function NumerosDoPeriodo({ resumo }: { resumo: DadosFinanceiro["resumo"] }) {
  const ticketMedio = resumo.itensVendidos > 0 ? resumo.totalEntradas / resumo.itensVendidos : 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-400 mb-1">Entradas</div>
        <div className="text-xl font-bold text-green-700">{moeda(resumo.totalEntradas)}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-400 mb-1">Saídas</div>
        <div className="text-xl font-bold text-red-600">{moeda(resumo.totalSaidas)}</div>
      </div>
      <div className={`rounded-xl border p-4 ${resumo.resultado >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
        <div className={`text-xs mb-1 ${resumo.resultado >= 0 ? "text-blue-600" : "text-orange-600"}`}>Resultado</div>
        <div className={`text-xl font-bold ${resumo.resultado >= 0 ? "text-blue-700" : "text-orange-700"}`}>{moeda(resumo.resultado)}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-400 mb-1">Vendas/pedidos</div>
        <div className="text-xl font-bold text-gray-800">{resumo.itensVendidos}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-400 mb-1">Ticket médio</div>
        <div className="text-xl font-bold text-gray-800">{moeda(ticketMedio)}</div>
      </div>
    </div>
  );
}

// ─── PRINCIPAL 2 — Saúde do caixa: "algo está errado?" de relance ──
function SaudeDoCaixaSecao({ saude, onAbrirFechamento }: { saude: SaudeCaixa; onAbrirFechamento?: () => void }) {
  const { diasSemFechamento, pendentes, estornados, divergenciaUltimos7 } = saude;
  const temAlerta = diasSemFechamento.length > 1 || pendentes.qtd > 0 || estornados.qtd > 0 || Math.abs(divergenciaUltimos7.soma) >= 0.5;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3">🩺 Saúde do caixa</h3>
      {!temAlerta ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ Sem alertas — fechamentos recentes batendo, sem pendência nem estorno.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`rounded-lg p-3 ${diasSemFechamento.length > 1 ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
            <div className="text-xs text-gray-500 mb-1">Dias sem fechar</div>
            <div className={`text-lg font-bold ${diasSemFechamento.length > 1 ? "text-amber-700" : "text-gray-400"}`}>{diasSemFechamento.length}</div>
            {diasSemFechamento.length > 0 && (
              <button onClick={onAbrirFechamento} className="text-xs text-amber-700 hover:underline mt-1">
                {diasSemFechamento.map(abaLabel).join(", ")}
              </button>
            )}
          </div>
          <div className={`rounded-lg p-3 ${Math.abs(divergenciaUltimos7.soma) >= 0.5 ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
            <div className="text-xs text-gray-500 mb-1">Divergência (últimos 7 fechamentos)</div>
            <div className={`text-lg font-bold ${Math.abs(divergenciaUltimos7.soma) >= 0.5 ? "text-amber-700" : "text-gray-400"}`}>{moeda(divergenciaUltimos7.soma)}</div>
            {divergenciaUltimos7.piorDia && Math.abs(divergenciaUltimos7.piorDia.divergencia) >= 0.5 && (
              <div className="text-xs text-gray-400 mt-1">Pior dia: {abaLabel(divergenciaUltimos7.piorDia.aba)} ({moeda(divergenciaUltimos7.piorDia.divergencia)})</div>
            )}
          </div>
          <div className={`rounded-lg p-3 ${pendentes.qtd > 0 ? "bg-orange-50 border border-orange-200" : "bg-gray-50"}`}>
            <div className="text-xs text-gray-500 mb-1">Pagamentos pendentes</div>
            <div className={`text-lg font-bold ${pendentes.qtd > 0 ? "text-orange-700" : "text-gray-400"}`}>{pendentes.qtd}</div>
            {pendentes.qtd > 0 && <div className="text-xs text-gray-400 mt-1">{moeda(pendentes.valor)}</div>}
          </div>
          <div className={`rounded-lg p-3 ${estornados.qtd > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
            <div className="text-xs text-gray-500 mb-1">Estornos MP detectados</div>
            <div className={`text-lg font-bold ${estornados.qtd > 0 ? "text-red-700" : "text-gray-400"}`}>{estornados.qtd}</div>
            {estornados.qtd > 0 && <div className="text-xs text-gray-400 mt-1">{moeda(estornados.valor)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECUNDÁRIO — Entradas x Saídas por dia (gráfico que já existia) ──
function GraficoEntradasSaidas({ historico }: { historico: DiaHistorico[] }) {
  const maxBar = Math.max(...historico.map(d => Math.max(d.entradas, d.saidas)), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entradas x Saídas por dia</h3>
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-300 inline-block"></span>Entradas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-300 inline-block"></span>Saídas</span>
        </div>
      </div>
      {historico.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-gray-300 text-xs">Sem dados no período</div>
      ) : (
        <>
          <div className="flex items-end gap-0.5" style={{ height: 110 }}>
            {historico.map(d => {
              const hIn  = Math.max(Math.round((d.entradas / maxBar) * 104), d.entradas > 0 ? 3 : 0);
              const hOut = Math.max(Math.round((d.saidas   / maxBar) * 104), d.saidas   > 0 ? 3 : 0);
              return (
                <div key={d.aba} className="flex-1 flex items-end gap-px group cursor-default"
                  title={`${d.aba}\nEntradas: ${moeda(d.entradas)}\nSaídas: ${moeda(d.saidas)}`}>
                  <div className="flex-1 bg-emerald-200 group-hover:bg-emerald-400 rounded-t transition-colors" style={{ height: hIn }} />
                  <div className="flex-1 bg-red-200 group-hover:bg-red-400 rounded-t transition-colors" style={{ height: hOut }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-300 mt-1.5 border-t border-gray-100 pt-1.5">
            <span>{abaLabel(historico[0]?.aba || "")}</span>
            <span>{abaLabel(historico[historico.length - 1]?.aba || "")}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── SECUNDÁRIO — Formas de pagamento no período ──
function FormasDePagamento({ entradasPorFormaPagamento }: { entradasPorFormaPagamento: { forma: string; valor: number }[] }) {
  const maxForma = entradasPorFormaPagamento[0]?.valor || 1;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Formas de pagamento</h3>
      {entradasPorFormaPagamento.length === 0 ? (
        <p className="text-xs text-gray-300">Sem entradas no período</p>
      ) : (
        <div className="space-y-1.5">
          {entradasPorFormaPagamento.map(({ forma, valor }) => (
            <div key={forma} className="flex items-center gap-3 text-xs">
              <div className="w-28 text-gray-600 truncate">{forma}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-300 h-1.5 rounded-full" style={{ width: `${Math.round((valor / maxForma) * 100)}%` }} />
              </div>
              <div className="w-20 text-right font-semibold text-gray-700">{moeda(valor)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECUNDÁRIO — Saídas por categoria ──
function SaidasPorCategoria({ saidasPorCategoria, totalSaidas }: { saidasPorCategoria: { categoria: string; valor: number }[]; totalSaidas: number }) {
  const maxSaida = saidasPorCategoria[0]?.valor || 1;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saídas por categoria</h3>
        <span className="text-sm font-bold text-red-600">{moeda(totalSaidas)}</span>
      </div>
      {saidasPorCategoria.length === 0 ? (
        <p className="text-xs text-gray-300">Nenhuma saída no período</p>
      ) : (
        <div className="space-y-1.5">
          {saidasPorCategoria.slice(0, 8).map(({ categoria, valor }) => (
            <div key={categoria} className="flex items-center gap-3 text-xs">
              <div className="w-28 text-gray-600 truncate">{categoria}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-300 h-1.5 rounded-full" style={{ width: `${Math.round((valor / maxSaida) * 100)}%` }} />
              </div>
              <div className="w-20 text-right font-semibold text-gray-700">{moeda(valor)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECUNDÁRIO — Produtos/serviços mais vendidos (top 10) ──
function ProdutosMaisVendidos({ topProdutos }: { topProdutos: TopProduto[] }) {
  const maxProd = topProdutos[0]?.valor || 1;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🏆 Produtos/serviços mais vendidos</h3>
      {topProdutos.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-4">Sem dados de vendas no período</p>
      ) : (
        <div className="space-y-2">
          {topProdutos.slice(0, 10).map((p, i) => (
            <div key={p.nome} className="flex items-center gap-3">
              <span className={`w-5 text-xs font-bold text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300"}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-700 font-medium truncate">{p.nome}</div>
                <div className="bg-gray-100 rounded-full h-1.5 mt-1">
                  <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${Math.round((p.valor / maxProd) * 100)}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-bold text-gray-800">{moeda(p.valor)}</div>
                <div className="text-xs text-gray-400">{p.quantidade} un</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECUNDÁRIO — Fechamentos recentes (últimos 7, atalho pra Fechar Caixa) ──
function FechamentosRecentes({ historico, operador, onAbrirFechamento }: { historico: DiaHistorico[]; operador: OperadorFiltro; onAbrirFechamento?: () => void }) {
  const ultimos7 = [...historico].slice(-7).reverse();
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Fechamentos recentes {operador !== "todos" ? `— caixa de ${operador}` : ""}
        </h3>
        {onAbrirFechamento && (
          <button onClick={onAbrirFechamento} className="text-xs text-blue-700 hover:underline">Ver histórico completo →</button>
        )}
      </div>
      {ultimos7.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-4">Nenhum fechamento no período</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="py-1.5">Dia</th>
              <th className="py-1.5">Status</th>
              <th className="py-1.5 text-right">Entradas</th>
              <th className="py-1.5 text-right">Saídas</th>
              <th className="py-1.5 text-right">Divergência</th>
            </tr>
          </thead>
          <tbody>
            {ultimos7.map(dia => (
              <tr key={dia.aba} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5 text-gray-700">{abaLabel(dia.aba)}</td>
                <td className="py-1.5">
                  {dia.fechadoPor
                    ? <span className="text-green-700">🟢 Fechado</span>
                    : <span className="text-amber-600">🟡 Em aberto</span>}
                </td>
                <td className="py-1.5 text-right text-green-700">{moeda(dia.entradas)}</td>
                <td className="py-1.5 text-right text-red-600">{moeda(dia.saidas)}</td>
                <td className={`py-1.5 text-right font-semibold ${!dia.fechadoPor ? "text-gray-300" : Math.abs(dia.divergencia) < 0.5 ? "text-green-600" : "text-amber-600"}`}>
                  {!dia.fechadoPor ? "—" : Math.abs(dia.divergencia) < 0.5 ? "✓ Zero" : `${dia.divergencia > 0 ? "+" : ""}${moeda(dia.divergencia)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
