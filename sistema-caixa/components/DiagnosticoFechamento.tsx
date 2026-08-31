"use client";
import { useState, useEffect, useCallback } from "react";

// ── Demanda 153 — Diagnóstico de Fechamento, Camada D/4 (última): TELA ──
// Só interface: consome os endpoints prontos das Camadas A/B (GET
// /api/fechamento/diagnostico) e C (POST/PATCH .../resumo). Seção só-Admin
// dentro de Fechar Caixa, abaixo da discriminação por forma de pagamento.
// Mostra, pra qualquer dia: o resumo narrativo (edição manual na frente do
// texto da IA, badge "✎ editado") e os sinais agrupados por severidade.

interface SinalDiag {
  tipo: string;
  severidade: "info" | "atencao" | "critico";
  descricao: string;
  registros: { tabela: string; id: string }[];
}
interface DiagnosticoDia {
  dataDia: string;
  sinais: SinalDiag[];
  fechamentoGeral: {
    fechado_por: string | null;
    divergencia: number | string | null;
    resumo_ia: string | null;
    resumo_editado: string | null;
    resumo_gerado_em: string | null;
  } | null;
  totais: { totalEntradas: number; totalSaidas: number; saldoAcumulado: number };
}

const SEVERIDADES = [
  { chave: "critico" as const, rotulo: "🔴 Crítico",  caixa: "bg-red-50 border-red-200",     texto: "text-red-800" },
  { chave: "atencao" as const, rotulo: "🟡 Atenção",  caixa: "bg-amber-50 border-amber-200", texto: "text-amber-800" },
  { chave: "info"    as const, rotulo: "ℹ️ Info",     caixa: "bg-blue-50 border-blue-100",   texto: "text-blue-800" },
];

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// `<input type="date">` (yyyy-mm-dd) → DD-MM-AA do caixa (mesmo padrão da 129)
function isoParaDiaCaixa(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}-${mes}-${ano.slice(-2)}`;
}
function dthr(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function DiagnosticoFechamento() {
  const [dataFiltro, setDataFiltro] = useState(hojeISO());
  const [diag, setDiag] = useState<DiagnosticoDia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  // Prévia de dia ainda aberto: o endpoint gera mas não salva (salvar criaria
  // a linha e o dia apareceria como "fechado") — mostramos o texto efêmero.
  const [previa, setPrevia] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const dataDia = isoParaDiaCaixa(dataFiltro);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setPrevia(null);
    setEditando(false);
    try {
      const r = await fetch(`/api/fechamento/diagnostico?data=${dataDia}`);
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "Erro ao carregar o diagnóstico");
      setDiag(d);
    } catch (e) {
      setDiag(null);
      setErro(e instanceof Error ? e.message : "Erro ao carregar o diagnóstico");
    } finally {
      setCarregando(false);
    }
  }, [dataDia]);

  useEffect(() => { carregar(); }, [carregar]);

  const fg = diag?.fechamentoGeral ?? null;
  const resumoExibido = fg?.resumo_editado || fg?.resumo_ia || null;

  async function gerarResumo() {
    if (!diag) return;
    if (fg?.resumo_ia && !confirm("Gerar de novo? O texto automático é sobrescrito — a edição salva (se houver) é preservada.")) return;
    setGerando(true);
    setPrevia(null);
    try {
      const r = await fetch(`/api/fechamento/diagnostico/resumo?data=${dataDia}`, { method: "POST" });
      const d = await r.json();
      if (!r.ok || d.error) { alert(d.error || "Erro ao gerar o resumo."); return; }
      if (d.salvo) await carregar();
      else setPrevia(d.resumo); // dia ainda aberto — texto não salvo
    } catch {
      alert("Erro ao gerar o resumo.");
    } finally {
      setGerando(false);
    }
  }

  async function salvarEdicao() {
    setSalvandoEdicao(true);
    try {
      const r = await fetch(`/api/fechamento/diagnostico/resumo?data=${dataDia}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataDia, resumoEditado: textoEdicao }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { alert(d.error || "Erro ao salvar a edição."); return; }
      await carregar();
    } catch {
      alert("Erro ao salvar a edição.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-gray-700">🔍 Diagnóstico do fechamento</h3>
        <div className="flex items-center gap-2">
          {dataFiltro !== hojeISO() && (
            <button onClick={() => setDataFiltro(hojeISO())}
              className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50">
              Hoje
            </button>
          )}
          <input type="date" value={dataFiltro} max={hojeISO()}
            onChange={e => { if (e.target.value) setDataFiltro(e.target.value); }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400" />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Resumo do dia gerado por IA (editável) + sinais detectados automaticamente. Só narra e
        aponta — nenhuma correção é feita sozinha.
      </p>

      {carregando ? (
        <p className="text-sm text-gray-400 py-4 text-center">Carregando diagnóstico...</p>
      ) : erro ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {erro}</p>
      ) : diag && (
        <>
          {/* ── Resumo narrativo ── */}
          {!fg && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3">
              Este dia ainda não tem fechamento geral — o resumo só pode ser salvo depois de
              fechar o caixa. Dá pra gerar uma prévia (não fica salva).
            </div>
          )}

          {editando ? (
            <div className="mb-4">
              <textarea value={textoEdicao} onChange={e => setTextoEdicao(e.target.value)} rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-400" />
              <p className="text-xs text-gray-400 mt-1 mb-2">
                A edição fica salva por cima do texto da IA (que não se perde) — apagar tudo e
                salvar remove a edição e volta a mostrar o texto automático.
              </p>
              <div className="flex gap-2">
                <button onClick={salvarEdicao} disabled={salvandoEdicao}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                  {salvandoEdicao ? "Salvando..." : "Salvar edição"}
                </button>
                <button onClick={() => setEditando(false)}
                  className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          ) : resumoExibido || previa ? (
            <div className="mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {previa ?? resumoExibido}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {previa
                    ? "Prévia — não salva (o dia ainda não foi fechado)."
                    : <>
                        {fg?.resumo_editado
                          ? <span className="text-blue-600 font-semibold">✎ editado pelo Admin</span>
                          : `Gerado pela IA${fg?.resumo_gerado_em ? ` em ${dthr(fg.resumo_gerado_em)}` : ""}`}
                      </>}
                </p>
                <div className="flex gap-2">
                  {fg && !previa && (
                    <button onClick={() => { setTextoEdicao(resumoExibido ?? ""); setEditando(true); }}
                      className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                      ✎ Editar
                    </button>
                  )}
                  <button onClick={gerarResumo} disabled={gerando}
                    className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 disabled:opacity-50">
                    {gerando ? "Gerando..." : "↻ Gerar de novo"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <button onClick={gerarResumo} disabled={gerando}
                className="bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {gerando ? "Gerando resumo..." : fg ? "✨ Gerar resumo do dia" : "✨ Gerar prévia (não salva)"}
              </button>
            </div>
          )}

          {/* ── Sinais por severidade (crítico primeiro) ── */}
          {diag.sinais.length === 0 ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              ✓ Nenhum sinal detectado pelas regras automáticas neste dia.
            </p>
          ) : (
            <div className="space-y-3">
              {SEVERIDADES.map(sev => {
                const doNivel = diag.sinais.filter(s => s.severidade === sev.chave);
                if (doNivel.length === 0) return null;
                return (
                  <div key={sev.chave}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {sev.rotulo} ({doNivel.length})
                    </h4>
                    <div className="space-y-1.5">
                      {doNivel.map((s, i) => (
                        <div key={`${s.tipo}-${i}`} className={`border rounded-lg px-3 py-2 text-sm ${sev.caixa} ${sev.texto}`}>
                          <p>{s.descricao}</p>
                          <p className="mt-1 flex flex-wrap gap-1">
                            {s.registros.map(r => (
                              <span key={`${r.tabela}-${r.id}`}
                                className="font-mono text-[11px] bg-white/70 border border-current/20 rounded px-1.5 py-0.5"
                                title={r.tabela}>
                                {r.tabela === "pedido" ? "🧾" : r.tabela === "saida" ? "💸" : "🔒"} {r.id}
                              </span>
                            ))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
