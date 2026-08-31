"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { type Usuario } from "@/lib/usuarios";

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Conta {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  tipo: "pagar" | "receber";
  vencimento: string;
  status: "pendente" | "pago" | "atrasado";
  recorrente: boolean;
  frequencia: string | null;
  operador: string;
}

const STATUS_CFG: Record<Conta["status"], { label: string; classe: string }> = {
  pendente: { label: "Pendente", classe: "bg-gray-100 text-gray-600" },
  atrasado: { label: "Atrasado", classe: "bg-red-100 text-red-700" },
  pago:     { label: "Pago/Recebido", classe: "bg-green-100 text-green-700" },
};

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Demanda 096 — cadastro de obrigações futuras (a pagar ou a receber), com
// recorrência mensal e baixa que gera o lançamento real sozinha (Saída ou
// Entrada) — só o Admin usa esta tela, PDV nunca acessa contas futuras.
export function TelaContasPagarReceber({ operador }: { operador: Usuario }) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<"todas" | Conta["status"]>("todas");
  const [filtroTipo, setFiltroTipo] = useState<"todas" | Conta["tipo"]>("todas");

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState<Conta["tipo"]>("pagar");
  const [vencimento, setVencimento] = useState("");
  // Demanda 125: "Repete todo mês?" (checkbox) virou seletor com semanal —
  // caso real do pagamento semanal da Gabi, antes lançado 4x por mês na mão.
  const [recorrencia, setRecorrencia] = useState<"nao" | "semanal" | "mensal">("nao");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [baixando, setBaixando] = useState<string | null>(null);

  // Demanda 125: editar/cancelar conta ainda não paga.
  const [editando, setEditando] = useState<null | {
    id: string; nome: string; valor: string; categoria: string; vencimento: string;
  }>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  async function salvarEdicao() {
    if (!editando || salvandoEdicao) return;
    const v = parseFloat(editando.valor.replace(",", "."));
    if (!editando.nome.trim() || !editando.categoria.trim() || !editando.vencimento || !v || v <= 0) {
      alert("Preencha nome, valor, categoria e vencimento válidos.");
      return;
    }
    setSalvandoEdicao(true);
    try {
      const res = await fetch("/api/contas-pagar-receber", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editando.id, nome: editando.nome.trim(), valor: v,
          categoria: editando.categoria.trim(), vencimento: editando.vencimento,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao salvar edição."); return; }
      setEditando(null);
      await carregar();
    } catch {
      alert("Erro ao salvar edição.");
    } finally { setSalvandoEdicao(false); }
  }

  async function cancelarConta(c: Conta) {
    if (!confirm(`Cancelar a conta "${c.nome}" (${moeda(c.valor)})? Ela será removida da lista.`)) return;
    try {
      const res = await fetch("/api/contas-pagar-receber", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao cancelar conta."); return; }
      await carregar();
    } catch {
      alert("Erro ao cancelar conta.");
    }
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/contas-pagar-receber");
      const d = await r.json();
      setContas(d.contas || []);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  // Demanda 136: a aba não desmonta mais ao trocar — recarrega ao reativar.
  useRecarregarAoReativar(carregar);

  async function cadastrar() {
    if (!nome.trim() || !categoria.trim() || !vencimento) return;
    const v = parseFloat(valor.replace(",", "."));
    if (!v || v <= 0) return;

    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/contas-pagar-receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(), valor: v, categoria: categoria.trim(), tipo, vencimento,
          recorrente: recorrencia !== "nao",
          frequencia: recorrencia !== "nao" ? recorrencia : undefined,
          operador: operador.nome,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErro(data.error || "Erro ao cadastrar, tente de novo.");
        return;
      }
      setNome(""); setValor(""); setCategoria(""); setVencimento(""); setRecorrencia("nao");
      await carregar();
    } catch {
      setErro("Erro ao cadastrar, tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  // Demanda 166: a baixa pode voltar 409 com saídas parecidas (mesmo valor,
  // últimos 15 dias) — caso real da Gabi: saída manual lançada na sexta,
  // baixa formal na segunda criava uma SEGUNDA saída de R$350 sem perguntar.
  // Aqui o operador decide: vincular à saída existente (não cria nada), criar
  // uma nova mesmo assim (valor coincidiu por acaso), ou desistir.
  async function darBaixa(id: string, extra?: { ignorarSaidaExistente?: boolean; vincularSaidaId?: string }) {
    setBaixando(id);
    try {
      const res = await fetch("/api/contas-pagar-receber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, operador: operador.nome, ...extra }),
      });
      const data = await res.json();
      if (res.status === 409 && Array.isArray(data.saidasParecidas) && data.saidasParecidas.length > 0) {
        const s = data.saidasParecidas[0];
        const usarExistente = confirm(
          `Já existe uma saída de ${moeda(Number(s.valor))} lançada em ${s.data_dia} ` +
          `(${s.categoria_nome}${s.descricao ? ` — ${s.descricao}` : ""}, por ${s.operador}).\n\n` +
          `É ESSE pagamento?\n\nOK = sim, usar essa saída (não cria outra)\nCancelar = escolher o que fazer`
        );
        if (usarExistente) { setBaixando(null); return darBaixa(id, { vincularSaidaId: s.id }); }
        const criarNova = confirm(
          "Criar uma saída NOVA mesmo assim? (só se for um pagamento diferente que coincidiu de valor)\n\n" +
          "OK = criar nova saída\nCancelar = não dar baixa agora"
        );
        if (criarNova) { setBaixando(null); return darBaixa(id, { ignorarSaidaExistente: true }); }
        return;
      }
      if (!res.ok || data.error) {
        alert(data.error || "Erro ao dar baixa, tente de novo.");
        return;
      }
      await carregar();
    } catch {
      alert("Erro ao dar baixa, tente de novo.");
    } finally {
      setBaixando(null);
    }
  }

  const contasFiltradas = contas.filter(c =>
    (filtroStatus === "todas" || c.status === filtroStatus) &&
    (filtroTipo === "todas" || c.tipo === filtroTipo)
  );

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-700">📋 Contas a Pagar/Receber</h2>
        <p className="text-sm text-gray-500">Cadastre obrigações futuras — a baixa gera o lançamento real sozinha.</p>
      </div>

      {/* Cadastro */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-700 mb-3">Nova conta</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <input type="text" placeholder="Nome (ex: Aluguel)" value={nome}
            onChange={e => setNome(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
          <input type="number" placeholder="Valor R$" value={valor}
            onChange={e => setValor(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
          <input type="text" placeholder="Categoria (ex: Impostos)" value={categoria}
            onChange={e => setCategoria(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
          <select value={tipo} onChange={e => setTipo(e.target.value as Conta["tipo"])}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="pagar">A pagar</option>
            <option value="receber">A receber</option>
          </select>
          <input type="date" value={vencimento}
            onChange={e => setVencimento(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
          {/* Demanda 125: recorrência com opção semanal. */}
          <select value={recorrencia} onChange={e => setRecorrencia(e.target.value as typeof recorrencia)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="nao">Não repete</option>
            <option value="semanal">Toda semana</option>
            <option value="mensal">Todo mês</option>
          </select>
        </div>
        {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
        <button onClick={cadastrar} disabled={salvando}
          className="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
          {salvando ? "Salvando..." : "+ Cadastrar"}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(["todas", "pendente", "atrasado", "pago"] as const).map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
              filtroStatus === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            }`}>
            {s === "todas" ? "Todas" : STATUS_CFG[s].label}
          </button>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {(["todas", "pagar", "receber"] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
              filtroTipo === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            }`}>
            {t === "todas" ? "Todos os tipos" : t === "pagar" ? "A pagar" : "A receber"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200">
        {carregando ? (
          <p className="text-sm text-gray-400 p-5">Carregando...</p>
        ) : contasFiltradas.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">Nenhuma conta encontrada com esse filtro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="py-2.5 px-4">Nome</th>
                <th className="py-2.5 px-4">Categoria</th>
                <th className="py-2.5 px-4">Tipo</th>
                <th className="py-2.5 px-4">Vencimento</th>
                <th className="py-2.5 px-4 text-right">Valor</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {contasFiltradas.map(c => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 px-4 text-gray-800">
                    {c.nome}
                    {/* Demanda 125: tooltip reflete a frequência real. */}
                    {c.recorrente && (
                      <span className="ml-1.5 text-xs text-blue-500"
                        title={c.frequencia === "semanal" ? "Repete toda semana" : "Repete todo mês"}>
                        🔁{c.frequencia === "semanal" ? " semanal" : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-500">{c.categoria}</td>
                  <td className="py-2.5 px-4">
                    <span className={c.tipo === "pagar" ? "text-red-600" : "text-green-700"}>
                      {c.tipo === "pagar" ? "A pagar" : "A receber"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-600">{formatarData(c.vencimento)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-gray-800">{moeda(c.valor)}</td>
                  <td className="py-2.5 px-4">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_CFG[c.status].classe}`}>
                      {STATUS_CFG[c.status].label}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {c.status !== "pago" && (
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => darBaixa(c.id)} disabled={baixando === c.id}
                          className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-blue-700 disabled:opacity-50">
                          {baixando === c.id ? "..." : c.tipo === "pagar" ? "Marcar pago" : "Marcar recebido"}
                        </button>
                        {/* Demanda 125: editar/cancelar só enquanto não paga —
                            depois da baixa o valor já virou Saída/Entrada real. */}
                        <button onClick={() => setEditando({
                            id: c.id, nome: c.nome, valor: String(c.valor),
                            categoria: c.categoria, vencimento: c.vencimento,
                          })}
                          className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1.5 font-semibold hover:bg-blue-50">
                          Editar
                        </button>
                        <button onClick={() => cancelarConta(c)}
                          className="text-xs text-red-500 border border-red-200 rounded-lg px-2.5 py-1.5 font-semibold hover:bg-red-50">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Demanda 125: modal de edição de conta pendente/atrasada. */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">Editar conta</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <input type="text" value={editando.nome}
                  onChange={e => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                <input type="number" value={editando.valor}
                  onChange={e => setEditando({ ...editando, valor: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <input type="text" value={editando.categoria}
                  onChange={e => setEditando({ ...editando, categoria: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Vencimento</label>
                <input type="date" value={editando.vencimento}
                  onChange={e => setEditando({ ...editando, vencimento: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditando(null)}
                className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdicao}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
