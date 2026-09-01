"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { ModalPost, LABEL_STATUS } from "@/components/ModalPost";
import { ComoVaiFicarCanal } from "@/components/ComoVaiFicarCanal";
import { ConfiguracoesCanal } from "@/components/ConfiguracoesCanal";
import type { PostStatus } from "@/lib/labonStatus";
import type { CanalPost } from "@/lib/canalWhatsapp";

// Demanda 310: aba Marketing → Conteúdo. Mockup validado em
// pm/demandas/310-mockup/ (Calendario.dc.html, PreviewWhatsApp.dc.html,
// PreviewInstagram.dc.html), adaptado pros tokens/componentes reais do app
// (mesmo card-shell/nav de TelaConciliacao.tsx etc.), não CSS solto.
//
// Status tem dado real (webhook LABON_DASHBOARD_STATUS + tabela
// compartilhada labon_status_queue). Instagram fica visível no mockup, mas
// desabilitado, sem token da conta ainda (fora de escopo, ver 07-marketing.md).
// "Quadro" (Kanban) também fica desabilitado, sem mockup ainda.
//
// Demanda 354: Canal do WhatsApp real, integração direta (lib/canalWhatsapp.ts,
// app/api/marketing/canal/*), tabela própria (não usa labon_status_queue —
// por isso `posts`/`postsCanal` são 2 listas independentes, carregadas em
// paralelo). "Aprovar" publica na hora (sem robô de agendamento automático
// ainda, pedido à parte ao 01-N8N em 29/08).

type Canal = "whatsapp" | "instagram" | "canal";
type Visao = "plano" | "quadro" | "comoVaiFicar" | "configuracoes";

function chaveDiaRecife(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function horaRecife(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function dataHoraRecife(iso: string): string {
  return `${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit" }).format(new Date(iso))} · ${horaRecife(iso)}`;
}

function resumoPost(post: PostStatus): string {
  if (post.tipo_status === "text") return post.texto_status || "(sem texto)";
  if (post.tipo_status === "image") return `📷 ${post.caption_image || "(sem legenda)"}`;
  return `🎥 ${post.caption_video || "(sem legenda)"}`;
}

function resumoPostCanal(post: CanalPost): string {
  if (post.tipo === "text") return post.texto || "(sem texto)";
  if (post.tipo === "image") return `📷 ${post.caption_image || "(sem legenda)"}`;
  return `🎥 ${post.caption_video || "(sem legenda)"}`;
}

function construirGradeMes(ref: Date): { data: Date; doMesAtual: boolean }[] {
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const offsetInicio = primeiroDia.getDay();
  const totalCelulas = Math.ceil((offsetInicio + diasNoMes) / 7) * 7;
  return Array.from({ length: totalCelulas }, (_, i) => {
    const diaDoMes = i - offsetInicio + 1;
    return { data: new Date(ano, mes, diaDoMes), doMesAtual: diaDoMes >= 1 && diaDoMes <= diasNoMes };
  });
}

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function TelaMarketingConteudo() {
  const [posts, setPosts] = useState<PostStatus[]>([]);
  const [postsCanal, setPostsCanal] = useState<CanalPost[]>([]);
  // `picture` nunca é preenchido pela Z-API nesta conta (achado real, 354,
  // 30/08) — `preview` é quem tem a URL de verdade, sempre usar `picture ?? preview`.
  const [metadataCanal, setMetadataCanal] = useState<{ name?: string; picture?: string | null; preview?: string | null } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [visao, setVisao] = useState<Visao>("plano");
  const [mesRef, setMesRef] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [modalNovoPost, setModalNovoPost] = useState(false);
  const [dataInicialNovoPost, setDataInicialNovoPost] = useState<string | undefined>(undefined);
  const [postSelecionado, setPostSelecionado] = useState<PostStatus | null>(null);
  const [canalPostSelecionado, setCanalPostSelecionado] = useState<CanalPost | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/marketing/conteudo");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar posts");
      setPosts(data.posts ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar posts");
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarCanal = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing/canal");
      const data = await res.json();
      if (res.ok) setPostsCanal(data.posts ?? []);
    } catch { /* silencioso, mesma régua do polling do Status abaixo */ }
  }, []);

  useEffect(() => { carregar(); carregarCanal(); }, [carregar, carregarCanal]);
  useRecarregarAoReativar(useCallback(() => { carregar(); carregarCanal(); }, [carregar, carregarCanal]));

  // Foto/nome do canal, só pra exibir no avatar de "Como vai ficar" — busca
  // 1x quando a aba Canal é aberta pela primeira vez, não fica repetindo.
  useEffect(() => {
    if (canal !== "canal" || metadataCanal !== null) return;
    fetch("/api/marketing/canal/config").then(r => r.json()).then(d => {
      if (d?.metadata) setMetadataCanal({ name: d.metadata.name, picture: d.metadata.picture, preview: d.metadata.preview });
    }).catch(() => {});
  }, [canal, metadataCanal]);

  // Demanda 311: o Status real publicado pela rodada horária do
  // LABON_STATUS só aparecia aqui depois de trocar de aba e voltar
  // (useRecarregarAoReativar). Polling silencioso complementar: sem
  // `setCarregando(true)` (não faz a tela piscar "Carregando..."), sem
  // mexer em modal aberto (postSelecionado/modalNovoPost são estado à
  // parte, o modal já aberto guarda sua própria cópia local dos campos,
  // não é afetado por `posts` mudando por baixo). Erro de rede aqui fica
  // silencioso de propósito, não vale a pena um banner piscando a cada
  // rodada por uma falha transitória; a próxima rodada tenta de novo.
  // Demanda 354: mesmo polling pro Canal, mesma régua.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/marketing/conteudo");
        const data = await res.json();
        if (res.ok) setPosts(data.posts ?? []);
      } catch { /* silencioso, próxima rodada tenta de novo */ }
      carregarCanal();
    }, 15000);
    return () => clearInterval(id);
  }, [carregarCanal]);

  function abrirNovoPost(dataPreset?: string) {
    setDataInicialNovoPost(dataPreset);
    setModalNovoPost(true);
  }

  function selecionarCanal(novoCanal: Canal) {
    setCanal(novoCanal);
    if (novoCanal !== "canal" && visao === "configuracoes") setVisao("plano");
  }

  const postsOrdenados = useMemo(
    () => [...posts].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [posts]
  );
  const postsCanalOrdenados = useMemo(
    () => [...postsCanal].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [postsCanal]
  );

  const postsPorDia = useMemo(() => {
    const mapa = new Map<string, PostStatus[]>();
    for (const p of postsOrdenados) {
      const chave = chaveDiaRecife(p.scheduled_at);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(p);
    }
    return mapa;
  }, [postsOrdenados]);

  const postsCanalPorDia = useMemo(() => {
    const mapa = new Map<string, CanalPost[]>();
    for (const p of postsCanalOrdenados) {
      const chave = chaveDiaRecife(p.scheduled_at);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(p);
    }
    return mapa;
  }, [postsCanalOrdenados]);

  const celulasMes = useMemo(() => construirGradeMes(mesRef), [mesRef]);
  const hojeChave = chaveDiaRecife(new Date().toISOString());

  function fecharModais(recarregar: boolean) {
    setModalNovoPost(false);
    setDataInicialNovoPost(undefined);
    setPostSelecionado(null);
    setCanalPostSelecionado(null);
    if (recarregar) { carregar(); carregarCanal(); }
  }

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-700">🎨 Conteúdo</h2>
        <button onClick={() => abrirNovoPost()}
          className="flex items-center gap-1.5 bg-blue-700 text-white text-sm font-bold px-3.5 py-2 rounded-lg hover:bg-blue-800">
          + Novo post
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-200">
          <button onClick={() => selecionarCanal("whatsapp")}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 ${canal === "whatsapp" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-transparent text-gray-500"}`}>
            📱 WhatsApp Status
          </button>
          <button onClick={() => selecionarCanal("canal")}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 ${canal === "canal" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-transparent text-gray-500"}`}>
            📢 Canal do WhatsApp
          </button>
          <button disabled title="Em breve, aguardando conexão da conta comercial do Instagram"
            className="text-xs font-semibold rounded-lg px-3 py-1.5 border-2 border-transparent text-gray-300 cursor-not-allowed">
            📷 Instagram
          </button>
        </div>
        <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-200">
          <button onClick={() => setVisao("plano")}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 ${visao === "plano" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-transparent text-gray-500"}`}>
            📅 Plano de conteúdo
          </button>
          <button disabled title="Sem desenho ainda, fora de escopo por ora"
            className="text-xs font-semibold rounded-lg px-3 py-1.5 border-2 border-transparent text-gray-300 cursor-not-allowed">
            🗂️ Quadro
          </button>
          <button onClick={() => setVisao("comoVaiFicar")}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 ${visao === "comoVaiFicar" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-transparent text-gray-500"}`}>
            👁️ Como vai ficar
          </button>
          <button onClick={() => canal === "canal" && setVisao("configuracoes")} disabled={canal !== "canal"}
            title={canal !== "canal" ? "Só disponível na aba Canal do WhatsApp" : undefined}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 ${
              canal !== "canal" ? "border-transparent text-gray-300 cursor-not-allowed"
              : visao === "configuracoes" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-transparent text-gray-500"
            }`}>
            ⚙️ Configurações
          </button>
        </div>
      </div>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      {canal === "instagram" ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          Instagram ainda não está conectado, aguardando o Edvam mandar o token da conta comercial.
        </div>
      ) : canal === "canal" && visao === "configuracoes" ? (
        <ConfiguracoesCanal />
      ) : visao === "plano" ? (
        canal === "canal" ? (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-800 capitalize">
                {mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setMesRef(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">‹</button>
                <button onClick={() => { const d = new Date(); d.setDate(1); setMesRef(d); }}
                  className="px-2 h-7 rounded-md border border-gray-200 text-gray-500 text-xs hover:bg-gray-50">hoje</button>
                <button onClick={() => setMesRef(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DOW.map(d => <div key={d} className="text-[11px] font-bold text-gray-400 uppercase text-center py-1">{d}</div>)}
              {celulasMes.map(({ data, doMesAtual }, i) => {
                const chave = chaveDiaRecife(data.toISOString());
                const doDia = postsCanalPorDia.get(chave) ?? [];
                const clicavelParaCriar = doMesAtual && doDia.length === 0;
                return (
                  <div key={i} onClick={() => clicavelParaCriar && abrirNovoPost(chave)}
                    className={`min-h-[78px] rounded-lg p-1.5 text-xs flex flex-col gap-1 ${clicavelParaCriar ? "cursor-pointer hover:bg-blue-50" : ""} ${
                      doMesAtual ? (chave === hojeChave ? "bg-gray-50 outline outline-2 outline-blue-300 -outline-offset-2" : "bg-gray-50 text-gray-700") : "bg-gray-25 text-gray-300"
                    }`}>
                    <span>{data.getDate()}</span>
                    {doDia.slice(0, 2).map(p => (
                      <button key={p.id} onClick={e => { e.stopPropagation(); setCanalPostSelecionado(p); }}
                        className="text-[10px] font-semibold rounded px-1 py-0.5 text-white bg-indigo-600 truncate text-left">
                        {p.status === "published" ? "✓ canal" : `canal ${horaRecife(p.scheduled_at)}h`}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {carregando ? (
              <p className="text-sm text-gray-300 text-center py-6">Carregando...</p>
            ) : postsCanalOrdenados.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-6">Nenhum post do Canal ainda. Clique em &quot;Novo post&quot; pra criar o primeiro.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-200">
                    <th className="pb-2 pr-2">Data</th>
                    <th className="pb-2 pr-2">Post</th>
                    <th className="pb-2 pr-2">Canal</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {postsCanalOrdenados.map(p => (
                    <tr key={p.id} onClick={() => setCanalPostSelecionado(p)} className="border-b border-gray-100 last:border-none cursor-pointer hover:bg-gray-50">
                      <td className="py-2.5 pr-2 text-gray-500 whitespace-nowrap">{dataHoraRecife(p.scheduled_at)}</td>
                      <td className="py-2.5 pr-2 text-gray-700 max-w-xs truncate">{resumoPostCanal(p)}</td>
                      <td className="py-2.5 pr-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 bg-indigo-100 text-indigo-700">📢 Canal</span>
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 ${LABEL_STATUS[p.status].classe}`}>
                          {LABEL_STATUS[p.status].texto}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
        ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-800 capitalize">
                {mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setMesRef(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">‹</button>
                <button onClick={() => { const d = new Date(); d.setDate(1); setMesRef(d); }}
                  className="px-2 h-7 rounded-md border border-gray-200 text-gray-500 text-xs hover:bg-gray-50">hoje</button>
                <button onClick={() => setMesRef(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DOW.map(d => <div key={d} className="text-[11px] font-bold text-gray-400 uppercase text-center py-1">{d}</div>)}
              {celulasMes.map(({ data, doMesAtual }, i) => {
                const chave = chaveDiaRecife(data.toISOString());
                const doDia = postsPorDia.get(chave) ?? [];
                // Demanda 311: dia vazio do calendário abre "Novo post" com
                // aquela data já marcada (padrão Google Calendar, pedido do
                // Edvam). Dia com post continua só abrindo o(s) post(s);
                // stopPropagation nos botões de post evita disparar os 2.
                const clicavelParaCriar = doMesAtual && doDia.length === 0;
                return (
                  <div key={i} onClick={() => clicavelParaCriar && abrirNovoPost(chave)}
                    className={`min-h-[78px] rounded-lg p-1.5 text-xs flex flex-col gap-1 ${clicavelParaCriar ? "cursor-pointer hover:bg-blue-50" : ""} ${
                      doMesAtual ? (chave === hojeChave ? "bg-gray-50 outline outline-2 outline-blue-300 -outline-offset-2" : "bg-gray-50 text-gray-700") : "bg-gray-25 text-gray-300"
                    }`}>
                    <span>{data.getDate()}</span>
                    {doDia.slice(0, 2).map(p => (
                      <button key={p.id} onClick={e => { e.stopPropagation(); setPostSelecionado(p); }}
                        className="text-[10px] font-semibold rounded px-1 py-0.5 text-white bg-green-600 truncate text-left">
                        {p.status === "published" ? "✓ status" : `status ${horaRecife(p.scheduled_at)}h`}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {carregando ? (
              <p className="text-sm text-gray-300 text-center py-6">Carregando...</p>
            ) : postsOrdenados.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-6">Nenhum post ainda. Clique em &quot;Novo post&quot; pra criar o primeiro.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-200">
                    <th className="pb-2 pr-2">Data</th>
                    <th className="pb-2 pr-2">Post</th>
                    <th className="pb-2 pr-2">Canal</th>
                    <th className="pb-2 pr-2">Status</th>
                    <th className="pb-2">👁️ Viram</th>
                  </tr>
                </thead>
                <tbody>
                  {postsOrdenados.map(p => (
                    <tr key={p.id} onClick={() => setPostSelecionado(p)} className="border-b border-gray-100 last:border-none cursor-pointer hover:bg-gray-50">
                      <td className="py-2.5 pr-2 text-gray-500 whitespace-nowrap">{dataHoraRecife(p.scheduled_at)}</td>
                      <td className="py-2.5 pr-2 text-gray-700 max-w-xs truncate">{resumoPost(p)}</td>
                      <td className="py-2.5 pr-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 bg-green-100 text-green-700">📱 Status</span>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 ${LABEL_STATUS[p.status].classe}`}>
                          {LABEL_STATUS[p.status].texto}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500">
                        {p.status === "published" ? p.visualizacoes ?? 0 : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
        )
      ) : canal === "canal" ? (
        <ComoVaiFicarCanal posts={postsCanalOrdenados} fotoCanal={metadataCanal?.picture ?? metadataCanal?.preview} nomeCanal={metadataCanal?.name} onAbrirPost={setCanalPostSelecionado} />
      ) : (
        <ComoVaiFicarWhatsApp posts={postsOrdenados} onAbrirPost={setPostSelecionado} />
      )}

      {modalNovoPost && (
        <ModalPost dataInicial={dataInicialNovoPost} onFechar={() => fecharModais(false)} onSalvo={() => fecharModais(true)} />
      )}
      {postSelecionado && <ModalPost post={postSelecionado} onFechar={() => setPostSelecionado(null)} onSalvo={() => fecharModais(true)} />}
      {canalPostSelecionado && <ModalPost canalPost={canalPostSelecionado} onFechar={() => setCanalPostSelecionado(null)} onSalvo={() => fecharModais(true)} />}
    </div>
  );
}

function ComoVaiFicarWhatsApp({ posts, onAbrirPost }: { posts: PostStatus[]; onAbrirPost: (p: PostStatus) => void }) {
  const fila = posts.filter(p => p.status === "pending" || p.status === "approved").slice(0, 6);
  const sequencia = posts
    .filter(p => p.status === "published" || p.status === "approved")
    .sort((a, b) => (a.published_at ?? a.scheduled_at).localeCompare(b.published_at ?? b.scheduled_at))
    .slice(-8);

  return (
    <div className="grid grid-cols-[340px_1fr] gap-5 items-start">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Como aparece na lista de Status</p>
        <div className="flex items-center gap-3">
          <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "conic-gradient(#16a34a 0deg 260deg, #e5e7eb 260deg 360deg)" }}>
            <div className="w-[47px] h-[47px] rounded-full bg-green-100 flex items-center justify-center text-green-700 border-2 border-white">📷</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">JS Gráfica</div>
            <div className="text-xs text-gray-400">{sequencia.length} atualizaç{sequencia.length === 1 ? "ão" : "ões"}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mt-2">
          O anel colorido mostra que tem atualização não vista. Cada card ao lado é 1 tela dessa sequência, na ordem em que a pessoa vai passando.
        </p>

        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-6 mb-2">Fila (mais antigo primeiro)</p>
        {fila.length === 0 ? (
          <p className="text-xs text-gray-300">Nada na fila agora.</p>
        ) : fila.map(p => (
          <button key={p.id} onClick={() => onAbrirPost(p)} className="w-full flex items-center gap-2.5 py-2 text-left">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === "approved" ? "bg-blue-600" : "bg-gray-300"}`} />
            <span className="text-sm text-gray-700 flex-1 truncate">{resumoPost(p)}</span>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">{dataHoraRecife(p.scheduled_at)}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Sequência das telas</p>
        {sequencia.length === 0 ? (
          <p className="text-xs text-gray-300">Nenhum Status publicado ou agendado ainda.</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {sequencia.map((p, i) => (
              <button key={p.id} onClick={() => onAbrirPost(p)}
                className="flex-shrink-0 w-[150px] aspect-[9/16] rounded-xl relative overflow-hidden flex flex-col justify-between p-2.5 text-white text-left"
                style={
                  p.tipo_status === "image" && p.image_url
                    ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.55)), url(${p.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : p.tipo_status === "video"
                    ? { background: "linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.6)), #111827" }
                    : { background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)" }
                }>
                <div className="flex items-center justify-between">
                  <span className="w-[22px] h-[22px] rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-[11px] font-bold">{i + 1}</span>
                  {p.status === "published" && (
                    <span className="text-[10px] font-semibold bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">👁️ {p.visualizacoes ?? 0}</span>
                  )}
                </div>
                {p.tipo_status === "text" && <span className="text-[13px] font-semibold leading-snug">{p.texto_status}</span>}
                {p.tipo_status === "video" && <span className="text-2xl self-center">🎥</span>}
                <span className="text-[10px] opacity-85">
                  {dataHoraRecife(p.published_at ?? p.scheduled_at)} · {p.status === "published" ? "Publicado" : "Agendado"}
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 leading-relaxed mt-4">
          Só mostra o que está agendado ou já publicado, igual o Status de verdade. Diferente do Instagram, o Status some depois de 24h.
        </p>
      </div>
    </div>
  );
}
