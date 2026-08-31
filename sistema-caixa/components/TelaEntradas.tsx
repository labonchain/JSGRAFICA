"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { formatarDiaCaixa } from "@/lib/supabase";
import { USUARIOS, type Usuario } from "@/lib/usuarios";
import { ModalAdicionarEntrada } from "@/components/ModalAdicionarEntrada";

// ── Entradas (demanda 098) — ledger cronológico do dia, equivalente ao
// painel "Lançamentos de hoje" de Lançar Saídas (demanda 091), mas do lado
// das entradas: venda de balcão, pedido do WhatsApp pago, abertura e
// fechamento de caixa. Majoritariamente só leitura — a exceção é a entrada
// avulsa (demanda 269, botão "+ Adicionar entrada"), o único lançamento
// manual feito nesta tela. ──
interface Lancamento {
  id: string;
  tipo: "venda_balcao" | "pedido_pago" | "abertura" | "fechamento" | "entrada_avulsa";
  horario: string;
  operador: string | null;
  valor: number;
  descricao: string;
  // Demanda 271: só vêm preenchidos pra `entrada_avulsa` — precisa do id cru
  // (sem o prefixo `entrada-avulsa-`) e da conta pra editar/cancelar.
  entradaAvulsaId?: string;
  contaDestino?: string;
}

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hora(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function paraDDMMAAAA(dataDia: string): string {
  const [dd, mm, aa] = dataDia.split("-");
  if (!dd || !mm || !aa) return "";
  return `${dd}/${mm}/20${aa}`;
}

// Demanda 110: o campo de data virou `<input type="date">` (calendário
// nativo do navegador) em vez de texto livre "DD/MM/AAAA" — nem esse campo
// nem o de TelaFinanceiro.tsx (que também é `type="text"`) abriam calendário
// nenhum; não existia uma tela de referência "que já funciona" pra copiar,
// então o formato nativo do próprio `<input type="date">` ("AAAA-MM-DD") virou
// a referência. Conversão direta com `data_dia` ("DD-MM-AA"), sem inventar
// formato novo.
function dataDiaParaISO(dataDia: string): string {
  const [dd, mm, aa] = dataDia.split("-");
  if (!dd || !mm || !aa) return "";
  return `20${aa}-${mm}-${dd}`;
}

function isoParaDataDia(iso: string): string {
  const [aaaa, mm, dd] = iso.split("-");
  if (!dd || !mm || !aaaa) return "";
  return `${dd}-${mm}-${aaaa.slice(-2)}`;
}

const CFG_TIPO: Record<Lancamento["tipo"], { label: string; emoji: string; bg: string; texto: string }> = {
  venda_balcao:   { label: "Venda balcão", emoji: "🧾", bg: "bg-green-50", texto: "text-green-700" },
  pedido_pago:    { label: "Pedido pago",  emoji: "💬", bg: "bg-green-50", texto: "text-green-700" },
  abertura:       { label: "Abertura de caixa", emoji: "🔓", bg: "bg-blue-50", texto: "text-blue-700" },
  fechamento:     { label: "Fechamento",   emoji: "🔒", bg: "bg-gray-100", texto: "text-gray-600" },
  entrada_avulsa: { label: "Entrada avulsa", emoji: "➕", bg: "bg-teal-50", texto: "text-teal-700" },
};

// Demanda 106: `operadorFixo` trava o filtro pro PDV (Zu/Gabi só veem o
// próprio movimento, sem seletor pra escolher "todos") — Admin (sem essa
// prop) continua com o seletor livre, igual sempre foi.
// Demanda 269: `operadorLogado` é conceito diferente — quem está USANDO a
// tela agora (pra atribuir a entrada avulsa lançada e decidir se mostra o
// botão, mesma régua da 102: só Admin lança manualmente). Nem toda tela que
// usa `TelaEntradas` já tinha essa identidade disponível antes (achado ao
// implementar — o Admin, `app/page.tsx`, nunca passava nada).
export function TelaEntradas({ operadorFixo, operadorLogado }: { operadorFixo?: string; operadorLogado?: Usuario } = {}) {
  const [dataDia, setDataDia]       = useState(() => formatarDiaCaixa());
  const [dataInput, setDataInput]   = useState(() => dataDiaParaISO(formatarDiaCaixa()));
  const [operador, setOperador]     = useState(operadorFixo ?? "");
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  // Demanda 122: busca por texto + filtro por tipo, client-side (a lista já
  // vem inteira do dia/operador escolhido — volume pequeno o suficiente pra
  // não precisar de busca no banco).
  const [busca, setBusca]           = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<Lancamento["tipo"] | "todos">("todos");
  // Demanda 269.
  const [mostrarAdicionarEntrada, setMostrarAdicionarEntrada] = useState(false);
  // Demanda 271 — entrada avulsa sendo editada agora (null = modal fechado
  // ou no modo "adicionar").
  const [editandoEntrada, setEditandoEntrada] = useState<Lancamento | null>(null);

  const carregar = useCallback(async (dia: string, op: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ dia });
      if (op) params.set("operador", op);
      const res = await fetch(`/api/entradas?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar entradas");
      setLancamentos(data.lancamentos ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar entradas");
      setLancamentos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(dataDia, operador); }, [dataDia, operador, carregar]);
  // Demanda 136: a aba não desmonta mais ao trocar — recarrega ao reativar.
  useRecarregarAoReativar(() => carregar(dataDia, operador));

  function irParaHoje() {
    const hojeDia = formatarDiaCaixa();
    setDataDia(hojeDia);
    setDataInput(dataDiaParaISO(hojeDia));
  }

  function selecionarData(iso: string) {
    setDataInput(iso);
    const convertida = isoParaDataDia(iso);
    if (convertida) setDataDia(convertida);
  }

  // Demanda 269: entrada avulsa entra no total do dia junto com venda/pedido
  // — é dinheiro real que entrou, mesma natureza pro resumo.
  const totalVendasPedidos = lancamentos
    .filter(l => l.tipo === "venda_balcao" || l.tipo === "pedido_pago" || l.tipo === "entrada_avulsa")
    .reduce((acc, l) => acc + l.valor, 0);

  // Demanda 122: filtro por tipo + busca por texto (descrição ou operador),
  // aplicados só na lista exibida — o resumo do dia acima (total/contagem)
  // continua refletindo o dia inteiro, pra não parecer que o valor em caixa
  // mudou só porque o usuário está filtrando a visualização.
  const buscaNormalizada = busca.trim().toLowerCase();
  const filtroAtivo = tipoFiltro !== "todos" || buscaNormalizada.length > 0;
  const lancamentosFiltrados = lancamentos.filter(l => {
    if (tipoFiltro !== "todos" && l.tipo !== tipoFiltro) return false;
    if (buscaNormalizada) {
      const alvo = `${l.descricao} ${l.operador ?? ""}`.toLowerCase();
      if (!alvo.includes(buscaNormalizada)) return false;
    }
    return true;
  });

  return (
    <div className="overflow-y-auto h-full bg-gray-50">
      <div className="p-5 space-y-4">

        {/* ── Filtros — mesmo padrão visual do seletor de período custom de TelaFinanceiro.tsx ── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={irParaHoje}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              dataDia === formatarDiaCaixa() ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}>
            Hoje
          </button>
          <input type="date" value={dataInput}
            onChange={e => selecionarData(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white" />

          {operadorFixo ? (
            <span className="ml-auto border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50 text-gray-600">
              Seu movimento: <strong>{operadorFixo}</strong>
            </span>
          ) : (
            <select value={operador} onChange={e => setOperador(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white ml-auto">
              <option value="">Todos os operadores</option>
              {USUARIOS.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
            </select>
          )}
        </div>

        {/* ── Busca + filtro por tipo (demanda 122) ── */}
        <div className="flex flex-wrap items-center gap-2">
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por cliente, produto/serviço ou operador..."
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTipoFiltro("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tipoFiltro === "todos" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
              }`}>Todos os tipos</button>
            {(Object.keys(CFG_TIPO) as Lancamento["tipo"][]).map(tipo => (
              <button key={tipo} onClick={() => setTipoFiltro(tipo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tipoFiltro === tipo ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                }`}>{CFG_TIPO[tipo].emoji} {CFG_TIPO[tipo].label}</button>
            ))}
          </div>
        </div>

        {/* ── Resumo do dia ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">📥 Entradas — {paraDDMMAAAA(dataDia)}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {filtroAtivo
                ? `${lancamentosFiltrados.length} de ${lancamentos.length} lançamento${lancamentos.length !== 1 ? "s" : ""} no dia`
                : `${lancamentos.length} lançamento${lancamentos.length !== 1 ? "s" : ""} no dia`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-green-700">{moeda(totalVendasPedidos)}</span>
            {/* Demanda 269 — só o Admin lança entrada avulsa manualmente
                (mesma régua da 102 pra "Lançar Saídas"), Zu/Gabi (PDV) não
                veem o botão. */}
            {operadorLogado?.papel === "admin" && (
              <button onClick={() => setMostrarAdicionarEntrada(true)}
                className="bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-teal-800 whitespace-nowrap">
                + Adicionar entrada
              </button>
            )}
          </div>
        </div>

        {erro && <p className="text-xs text-red-500">{erro}</p>}

        {/* ── Lista cronológica — mesmo padrão de card tingido do painel
             "Lançamentos de hoje" em Lançar Saídas (demanda 091), cor verde/
             azul/cinza em vez de vermelho pra distinguir o tipo de evento. ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {carregando ? (
            <p className="text-xs text-gray-300 text-center py-6">Carregando...</p>
          ) : lancamentos.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-6">Nenhum lançamento nesse dia</p>
          ) : lancamentosFiltrados.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-6">Nenhum lançamento encontrado com esse filtro</p>
          ) : (
            <div className="space-y-2">
              {lancamentosFiltrados.map(l => {
                const cfg = CFG_TIPO[l.tipo];
                // Demanda 271: editar/cancelar só entrada avulsa, só Admin —
                // venda/pedido/abertura/fechamento continuam sem esse botão
                // (não são lançamentos manuais desta tela).
                const podeEditar = l.tipo === "entrada_avulsa" && operadorLogado?.papel === "admin";
                return (
                  <div key={l.id} className={`${cfg.bg} rounded-lg p-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">{cfg.emoji} {l.descricao}</span>
                      <span className={`text-sm font-bold ${cfg.texto}`}>{moeda(l.valor)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{cfg.label}{l.operador ? ` · ${l.operador}` : ""}</span>
                      <span className="text-xs text-gray-400">{hora(l.horario)}</span>
                    </div>
                    {podeEditar && (
                      <button onClick={() => setEditandoEntrada(l)}
                        className="mt-1.5 text-xs text-teal-700 hover:text-teal-900 font-medium">
                        ✏️ Editar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {mostrarAdicionarEntrada && operadorLogado && (
        <ModalAdicionarEntrada
          operador={operadorLogado.nome}
          dataDiaDefault={dataDia}
          onFechar={() => setMostrarAdicionarEntrada(false)}
          onAdicionada={() => { setMostrarAdicionarEntrada(false); carregar(dataDia, operador); }}
        />
      )}

      {editandoEntrada && operadorLogado && editandoEntrada.entradaAvulsaId && editandoEntrada.contaDestino && (
        <ModalAdicionarEntrada
          operador={operadorLogado.nome}
          dataDiaDefault={dataDia}
          entradaExistente={{
            id: editandoEntrada.entradaAvulsaId,
            valor: editandoEntrada.valor,
            contaDestino: editandoEntrada.contaDestino,
            descricao: editandoEntrada.descricao,
            dataDia,
          }}
          onFechar={() => setEditandoEntrada(null)}
          onAdicionada={() => { setEditandoEntrada(null); carregar(dataDia, operador); }}
        />
      )}
    </div>
  );
}
