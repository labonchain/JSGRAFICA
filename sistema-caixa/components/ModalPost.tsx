"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PostStatus, TipoStatus } from "@/lib/labonStatus";
import type { CanalPost, TipoCanalPost } from "@/lib/canalWhatsapp";

// Demanda 310: modal de "Novo post" / edição+aprovação, mockup validado em
// pm/demandas/310-mockup/NovoPost.dc.html. A seção Instagram aparece (fiel
// ao mockup), mas fica desabilitada, sem token da conta ainda, fora de
// escopo desta demanda (ver briefing 07-marketing.md).
//
// Demanda 354: seção "Canal do WhatsApp" real, ao lado de Status. Diferente
// do Status (integração via webhook compartilhado do LabOnchain), o Canal
// fala direto com a Z-API e guarda posts em tabela própria
// (jsgrafica_canal_posts, lib/canalWhatsapp.ts) — por isso os 2 canais têm
// state e chamadas de API independentes neste componente, embora
// compartilhem a mesma UI de "Novo post". "Aprovar" publica NA HORA (sem
// robô de agendamento ainda, pedido à parte ao 01-N8N).

export const LABEL_STATUS: Record<PostStatus["status"], { texto: string; classe: string }> = {
  pending: { texto: "Rascunho", classe: "text-gray-600 bg-gray-100" },
  approved: { texto: "📅 Agendado", classe: "text-blue-700 bg-blue-100" },
  published: { texto: "✅ Publicado", classe: "text-green-700 bg-green-100" },
  cancelled: { texto: "🚫 Cancelado", classe: "text-gray-400 bg-gray-100" },
  error: { texto: "⚠️ Erro", classe: "text-amber-700 bg-amber-100" },
};

// Recife é UTC-3 fixo (Brasil aboliu horário de verão em 2019); literal de
// offset evita depender do fuso do navegador de quem está usando o sistema.
function paraCampoData(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function paraCampoHora(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function deCamposParaISO(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00-03:00`).toISOString();
}

export function ModalPost({ post, canalPost, dataInicial, onFechar, onSalvo }: {
  post?: PostStatus;
  canalPost?: CanalPost; // demanda 354: post existente do Canal (mutuamente exclusivo com `post`)
  dataInicial?: string; // AAAA-MM-DD, pré-preenche "Agendar" ao criar (demanda 311, clique no calendário)
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const agora = new Date();

  // ── Status (WhatsApp Status), estado original, sem mudança de comportamento ──
  const [tipo, setTipo] = useState<TipoStatus>(post?.tipo_status ?? "text");
  const [texto, setTexto] = useState(post?.texto_status ?? "");
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(post?.video_url ?? "");
  const [captionImage, setCaptionImage] = useState(post?.caption_image ?? "");
  const [captionVideo, setCaptionVideo] = useState(post?.caption_video ?? "");
  const [dataAgendada, setDataAgendada] = useState(post ? paraCampoData(post.scheduled_at) : (dataInicial ?? paraCampoData(agora.toISOString())));
  const [horaAgendada, setHoraAgendada] = useState(post ? paraCampoHora(post.scheduled_at) : paraCampoHora(agora.toISOString()));

  // ── Canal do WhatsApp (demanda 354), state independente ──
  const [tipoCanal, setTipoCanal] = useState<TipoCanalPost>(canalPost?.tipo ?? "text");
  const [textoCanal, setTextoCanal] = useState(canalPost?.texto ?? "");
  const [imageUrlCanal, setImageUrlCanal] = useState(canalPost?.image_url ?? "");
  const [videoUrlCanal, setVideoUrlCanal] = useState(canalPost?.video_url ?? "");
  const [captionImageCanal, setCaptionImageCanal] = useState(canalPost?.caption_image ?? "");
  const [captionVideoCanal, setCaptionVideoCanal] = useState(canalPost?.caption_video ?? "");
  const [dataAgendadaCanal, setDataAgendadaCanal] = useState(canalPost ? paraCampoData(canalPost.scheduled_at) : (dataInicial ?? paraCampoData(agora.toISOString())));
  const [horaAgendadaCanal, setHoraAgendadaCanal] = useState(canalPost ? paraCampoHora(canalPost.scheduled_at) : paraCampoHora(agora.toISOString()));

  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null); // qual ação está em voo
  const [erro, setErro] = useState<string | null>(null);
  // Demanda 311: webhook compartilhado só aceita `editar` em pending/approved
  // (rejeita cancelled/published/error com status_invalido_para_editar, achado
  // real no código do node "Editar Post: Verificar"). Não dá pra "reativar"
  // sem mudar o webhook deles, o caminho é duplicar: usa a ação `criar` já
  // existente, com o conteúdo do post original pré-preenchido. Mesmo
  // princípio vale pro Canal (354): "editar" só aceita pending/approved.
  const [duplicando, setDuplicando] = useState(false);

  // Modo: cada tela "de um post só" (editar/ver Status OU Canal existente)
  // esconde a outra seção funcional — evita o usuário preencher uma seção
  // que a ação de salvar nem olha. Duplicando (de qualquer origem) volta a
  // mostrar as 2, igual à criação do zero (mesmo princípio: pode duplicar
  // pra um canal e aproveitar pra também postar no outro).
  const editandoStatusUnico = !!post && !duplicando;
  const editandoCanalUnico = !!canalPost && !duplicando;
  const mostrarSecaoStatus = !editandoCanalUnico;
  const mostrarSecaoCanal = !editandoStatusUnico;
  const emModoCriacao = (!post && !canalPost) || duplicando;

  const somenteLeituraStatus = post && !duplicando ? !["pending", "approved"].includes(post.status) : false;
  const somenteLeituraCanal = canalPost && !duplicando ? !["pending", "approved"].includes(canalPost.status) : false;

  function duplicar() {
    const agoraDuplicar = new Date();
    setDataAgendada(paraCampoData(agoraDuplicar.toISOString()));
    setHoraAgendada(paraCampoHora(agoraDuplicar.toISOString()));
    setErro(null);
    setDuplicando(true);
  }

  function duplicarCanal() {
    const agoraDuplicar = new Date();
    setDataAgendadaCanal(paraCampoData(agoraDuplicar.toISOString()));
    setHoraAgendadaCanal(paraCampoHora(agoraDuplicar.toISOString()));
    setErro(null);
    setDuplicando(true);
  }

  async function selecionarArquivoGenerico(e: React.ChangeEvent<HTMLInputElement>, tipoArquivo: "image" | "video", setUrl: (url: string) => void) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoArquivo(true);
    setErro(null);
    try {
      const resUrl = await fetch("/api/inbox/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: arquivo.name }),
      });
      const dadosUrl = await resUrl.json();
      if (!resUrl.ok || dadosUrl.error) throw new Error(dadosUrl.error || "Erro ao gerar URL de upload");

      const { error: erroUpload } = await supabase.storage.from("inbox-media").uploadToSignedUrl(dadosUrl.path, dadosUrl.token, arquivo);
      if (erroUpload) throw new Error(erroUpload.message);

      const { data } = supabase.storage.from("inbox-media").getPublicUrl(dadosUrl.path);
      setUrl(data.publicUrl);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar arquivo");
    } finally {
      setEnviandoArquivo(false);
      e.target.value = "";
    }
  }

  function camposComuns() {
    return {
      tipo_status: tipo,
      texto_status: tipo === "text" ? (texto || null) : null,
      image_url: tipo === "image" ? (imageUrl || null) : null,
      video_url: tipo === "video" ? (videoUrl || null) : null,
      caption_image: tipo === "image" ? (captionImage || null) : null,
      caption_video: tipo === "video" ? (captionVideo || null) : null,
      scheduled_at: deCamposParaISO(dataAgendada, horaAgendada),
    };
  }

  function camposComunsCanal() {
    return {
      tipo: tipoCanal,
      texto: tipoCanal === "text" ? (textoCanal || null) : null,
      image_url: tipoCanal === "image" ? (imageUrlCanal || null) : null,
      video_url: tipoCanal === "video" ? (videoUrlCanal || null) : null,
      caption_image: tipoCanal === "image" ? (captionImageCanal || null) : null,
      caption_video: tipoCanal === "video" ? (captionVideoCanal || null) : null,
      scheduled_at: deCamposParaISO(dataAgendadaCanal, horaAgendadaCanal),
    };
  }

  function validar(): string | null {
    if (tipo === "text" && !texto.trim()) return "Escreva o texto do Status.";
    if (tipo === "image" && !imageUrl) return "Anexe uma imagem no Status.";
    if (tipo === "video" && !videoUrl) return "Anexe um vídeo no Status.";
    return null;
  }

  function validarCanal(): string | null {
    if (tipoCanal === "text" && !textoCanal.trim()) return "Escreva o texto do post do Canal.";
    if (tipoCanal === "image" && !imageUrlCanal) return "Anexe uma imagem no Canal.";
    if (tipoCanal === "video" && !videoUrlCanal) return "Anexe um vídeo no Canal.";
    return null;
  }

  function statusTemConteudo(): boolean {
    return tipo === "text" ? !!texto.trim() : tipo === "image" ? !!imageUrl : !!videoUrl;
  }
  function canalTemConteudo(): boolean {
    return tipoCanal === "text" ? !!textoCanal.trim() : tipoCanal === "image" ? !!imageUrlCanal : !!videoUrlCanal;
  }

  // Demanda 354: criação combinada — cada seção (Status/Canal) só entra na
  // chamada se tiver conteúdo de verdade; precisa de pelo menos 1 das 2.
  // Cada chamada é independente (canal/tabela diferentes), erro de uma não
  // desfaz a outra que já tiver sido criada — reportado junto no mesmo erro
  // se as 2 falharem, ou só a que falhou se só 1 falhar.
  async function salvarRascunho() {
    const usaStatus = statusTemConteudo();
    const usaCanal = canalTemConteudo();
    if (!usaStatus && !usaCanal) { setErro("Preencha o conteúdo de pelo menos um canal (Status ou Canal do WhatsApp)."); return; }
    if (usaStatus) { const m = validar(); if (m) { setErro(m); return; } }
    if (usaCanal) { const m = validarCanal(); if (m) { setErro(m); return; } }

    setSalvando("criar");
    setErro(null);
    const erros: string[] = [];
    try {
      if (usaStatus) {
        const res = await fetch("/api/marketing/conteudo", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(camposComuns()),
        });
        const data = await res.json();
        if (!res.ok || data.error) erros.push(`Status: ${data.error || "erro ao criar"}`);
      }
      if (usaCanal) {
        const res = await fetch("/api/marketing/canal", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(camposComunsCanal()),
        });
        const data = await res.json();
        if (!res.ok || data.error) erros.push(`Canal: ${data.error || "erro ao criar"}`);
      }
      if (erros.length > 0) { setErro(erros.join(" · ")); return; }
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar post");
    } finally {
      setSalvando(null);
    }
  }

  async function executarAcao(acao: "editar" | "aprovar" | "cancelar") {
    if (!post) return;
    if (acao === "cancelar" && !confirm("Cancelar este post? Ele sai da fila de publicação.")) return;
    const msg = acao === "editar" ? validar() : null;
    if (msg) { setErro(msg); return; }
    setSalvando(acao);
    setErro(null);
    try {
      const body = acao === "editar" ? { id: post.id, acao, ...camposComuns() } : { id: post.id, acao };
      const res = await fetch("/api/marketing/conteudo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao atualizar post");
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar post");
    } finally {
      setSalvando(null);
    }
  }

  // Demanda 354: "aprovar" do Canal publica DE VERDADE na hora (chama a
  // Z-API real) — mesmo confirm de cuidado que cancelar, porque não tem
  // volta depois de publicado. Demanda 362: "agendar" só marca o post pra
  // publicação futura (o robô da 355 publica quando a hora chegar), sem
  // chamar a Z-API agora — não precisa do mesmo confirm por ser reversível
  // (dá pra editar ou cancelar antes da hora chegar).
  async function executarAcaoCanal(acao: "editar" | "aprovar" | "agendar" | "cancelar") {
    if (!canalPost) return;
    if (acao === "cancelar" && !confirm("Cancelar este post? Ele sai da fila de publicação.")) return;
    if (acao === "aprovar" && !confirm("Publicar agora de verdade no Canal do WhatsApp? Não tem como desfazer depois.")) return;
    const msg = acao === "editar" ? validarCanal() : null;
    if (msg) { setErro(msg); return; }
    setSalvando(acao);
    setErro(null);
    try {
      const body = acao === "editar" ? { id: canalPost.id, acao, ...camposComunsCanal() } : { id: canalPost.id, acao };
      const res = await fetch("/api/marketing/canal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao atualizar post do Canal");
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar post do Canal");
    } finally {
      setSalvando(null);
    }
  }

  const statusAtual = post?.status ?? canalPost?.status;
  const erroDetalheAtual = post?.erro_detalhe ?? canalPost?.erro_detalhe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[42rem] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg mb-1">{duplicando ? "Duplicar post" : (!post && !canalPost) ? "Novo post" : "Post"}</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          {duplicando
            ? "Cria um post novo com este conteúdo. O original continua cancelado, não é reaproveitado."
            : "O conteúdo pode ser diferente em cada canal: o que estiver escrito abaixo é exatamente o que vai ser postado."}
        </p>

        {(post || canalPost) && !duplicando && statusAtual && (
          <div className="mb-4">
            <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${LABEL_STATUS[statusAtual].classe}`}>{LABEL_STATUS[statusAtual].texto}</span>
            {erroDetalheAtual && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">{erroDetalheAtual}</p>}
          </div>
        )}

        {/* Seção WhatsApp Status, funcional */}
        {mostrarSecaoStatus && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="w-6.5 h-6.5 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">📱</span>
            <span className="text-sm font-bold text-gray-800">WhatsApp Status</span>
          </div>

          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</p>
          <div className="flex gap-1.5 mb-3.5">
            {(["text", "image", "video"] as TipoStatus[]).map(t => (
              <button key={t} disabled={somenteLeituraStatus} onClick={() => setTipo(t)}
                className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 disabled:opacity-50 ${
                  tipo === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                }`}>
                {t === "text" ? "Texto" : t === "image" ? "Imagem" : "Vídeo"}
              </button>
            ))}
          </div>

          {tipo === "text" && (
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Texto</p>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} disabled={somenteLeituraStatus} rows={3}
                placeholder="Ex.: Bom dia! Hoje funcionamos até as 18h 😊"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3.5 disabled:bg-gray-50 focus:outline-none focus:border-blue-400" />
            </>
          )}

          {(tipo === "image" || tipo === "video") && (
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Arquivo</p>
              <div className="flex gap-2 mb-3.5">
                {(tipo === "image" ? imageUrl : videoUrl) ? (
                  <div className="relative w-22 h-22 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {tipo === "image"
                      ? <img src={imageUrl} alt="Anexo" className="w-full h-full object-cover" />
                      : <span className="text-2xl">🎥</span>}
                    {!somenteLeituraStatus && (
                      <button onClick={() => tipo === "image" ? setImageUrl("") : setVideoUrl("")}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white border border-gray-200 text-red-600 text-xs shadow">✕</button>
                    )}
                  </div>
                ) : !somenteLeituraStatus && (
                  <label className="w-22 h-22 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-xs cursor-pointer gap-1">
                    {enviandoArquivo ? "Enviando..." : <>+<span>Anexar</span></>}
                    <input type="file" accept={tipo === "image" ? "image/*" : "video/*"} className="hidden" disabled={enviandoArquivo}
                      onChange={e => selecionarArquivoGenerico(e, tipo, tipo === "image" ? setImageUrl : setVideoUrl)} />
                  </label>
                )}
              </div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Legenda</p>
              <textarea value={tipo === "image" ? captionImage : captionVideo} disabled={somenteLeituraStatus}
                onChange={e => tipo === "image" ? setCaptionImage(e.target.value) : setCaptionVideo(e.target.value)} rows={2}
                placeholder="Legenda (opcional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3.5 disabled:bg-gray-50 focus:outline-none focus:border-blue-400" />
            </>
          )}

          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Agendar</p>
          <div className="flex gap-2.5">
            <input type="date" value={dataAgendada} disabled={somenteLeituraStatus} onChange={e => setDataAgendada(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
            <input type="time" value={horaAgendada} disabled={somenteLeituraStatus} onChange={e => setHoraAgendada(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
          </div>
        </div>
        )}

        {/* Seção Canal do WhatsApp, real (demanda 354). "Aprovar" publica na
            hora, chamando a Z-API de verdade — sem robô de agendamento
            automático ainda (pedido à parte ao 01-N8N, 29/08). */}
        {mostrarSecaoCanal && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-6.5 h-6.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm">📢</span>
            <span className="text-sm font-bold text-gray-800">Canal do WhatsApp</span>
          </div>
          <p className="text-[11px] text-indigo-500 mb-3.5">Fica permanente no histórico do canal, diferente do Status (não expira em 24h).</p>

          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</p>
          <div className="flex gap-1.5 mb-3.5">
            {(["text", "image", "video"] as TipoCanalPost[]).map(t => (
              <button key={t} disabled={somenteLeituraCanal} onClick={() => setTipoCanal(t)}
                className={`text-xs font-semibold rounded-lg px-3 py-1.5 border-2 disabled:opacity-50 ${
                  tipoCanal === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                }`}>
                {t === "text" ? "Texto" : t === "image" ? "Imagem" : "Vídeo"}
              </button>
            ))}
          </div>

          {tipoCanal === "text" && (
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Texto</p>
              <textarea value={textoCanal} onChange={e => setTextoCanal(e.target.value)} disabled={somenteLeituraCanal} rows={3}
                placeholder="Ex.: Chegou nossa nova linha de cartão de visita fosco! Confira os modelos 👇"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3.5 disabled:bg-gray-50 focus:outline-none focus:border-blue-400" />
            </>
          )}

          {(tipoCanal === "image" || tipoCanal === "video") && (
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Arquivo</p>
              <div className="flex gap-2 mb-3.5">
                {(tipoCanal === "image" ? imageUrlCanal : videoUrlCanal) ? (
                  <div className="relative w-22 h-22 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {tipoCanal === "image"
                      ? <img src={imageUrlCanal} alt="Anexo" className="w-full h-full object-cover" />
                      : <span className="text-2xl">🎥</span>}
                    {!somenteLeituraCanal && (
                      <button onClick={() => tipoCanal === "image" ? setImageUrlCanal("") : setVideoUrlCanal("")}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white border border-gray-200 text-red-600 text-xs shadow">✕</button>
                    )}
                  </div>
                ) : !somenteLeituraCanal && (
                  <label className="w-22 h-22 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-xs cursor-pointer gap-1">
                    {enviandoArquivo ? "Enviando..." : <>+<span>Anexar</span></>}
                    <input type="file" accept={tipoCanal === "image" ? "image/*" : "video/*"} className="hidden" disabled={enviandoArquivo}
                      onChange={e => selecionarArquivoGenerico(e, tipoCanal, tipoCanal === "image" ? setImageUrlCanal : setVideoUrlCanal)} />
                  </label>
                )}
              </div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Legenda</p>
              <textarea value={tipoCanal === "image" ? captionImageCanal : captionVideoCanal} disabled={somenteLeituraCanal}
                onChange={e => tipoCanal === "image" ? setCaptionImageCanal(e.target.value) : setCaptionVideoCanal(e.target.value)} rows={2}
                placeholder="Legenda (opcional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3.5 disabled:bg-gray-50 focus:outline-none focus:border-blue-400" />
            </>
          )}

          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Agendar</p>
          <div className="flex gap-2.5">
            <input type="date" value={dataAgendadaCanal} disabled={somenteLeituraCanal} onChange={e => setDataAgendadaCanal(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
            <input type="time" value={horaAgendadaCanal} disabled={somenteLeituraCanal} onChange={e => setHoraAgendadaCanal(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
          </div>
          {emModoCriacao && (
            <p className="text-[11px] text-gray-400 mt-2">Salve como rascunho primeiro. Depois, na tela do post, escolha "Aprovar e publicar agora" (chama o WhatsApp na hora) ou "Agendar" (só marca pra esse horário, o robô publica sozinho quando chegar a hora).</p>
          )}
        </div>
        )}

        {/* Seção Instagram, mockup fiel, desabilitada (sem token ainda, fora
            de escopo da demanda 310, ver briefing 07-marketing.md). */}
        {emModoCriacao && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4 opacity-50 select-none">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-6.5 h-6.5 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-sm">📷</span>
            <span className="text-sm font-bold text-gray-800">Instagram</span>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 ml-auto">Em breve</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Aguardando o Edvam conectar a conta comercial do Instagram.</p>
        </div>
        )}

        {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">⚠️ {erro}</p>}

        {emModoCriacao && (
          <div className="flex gap-2.5 mt-2">
            <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
            <button onClick={salvarRascunho} disabled={!!salvando}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
              {salvando ? "Salvando..." : "Salvar como rascunho"}
            </button>
          </div>
        )}

        {editandoStatusUnico && post && !somenteLeituraStatus && (
          <div className="space-y-2 mt-2">
            <div className="flex gap-2.5">
              <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Fechar</button>
              <button onClick={() => executarAcao("editar")} disabled={!!salvando}
                className="flex-1 border-2 border-blue-500 text-blue-700 rounded-lg py-2.5 text-sm font-bold hover:bg-blue-50 disabled:opacity-50">
                {salvando === "editar" ? "Salvando..." : "Salvar edição"}
              </button>
              {post.status === "pending" && (
                <button onClick={() => executarAcao("aprovar")} disabled={!!salvando}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                  {salvando === "aprovar" ? "Aprovando..." : "✓ Aprovar"}
                </button>
              )}
            </div>
            <button onClick={() => executarAcao("cancelar")} disabled={!!salvando} className="w-full text-xs text-gray-400 hover:text-red-500">
              🚫 Cancelar este post
            </button>
          </div>
        )}

        {editandoStatusUnico && post && somenteLeituraStatus && (
          <div className="flex gap-2.5 mt-2">
            <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Fechar</button>
            <button onClick={duplicar} className="flex-1 border-2 border-blue-500 text-blue-700 rounded-lg py-2.5 text-sm font-bold hover:bg-blue-50">
              📋 Duplicar
            </button>
          </div>
        )}

        {editandoCanalUnico && canalPost && !somenteLeituraCanal && (
          <div className="space-y-2 mt-2">
            <div className="flex gap-2.5">
              <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Fechar</button>
              <button onClick={() => executarAcaoCanal("editar")} disabled={!!salvando}
                className="flex-1 border-2 border-blue-500 text-blue-700 rounded-lg py-2.5 text-sm font-bold hover:bg-blue-50 disabled:opacity-50">
                {salvando === "editar" ? "Salvando..." : "Salvar edição"}
              </button>
            </div>
            {canalPost.status === "pending" && (
              <div className="flex gap-2.5">
                <button onClick={() => executarAcaoCanal("agendar")} disabled={!!salvando}
                  className="flex-1 border-2 border-indigo-500 text-indigo-700 rounded-lg py-2.5 text-sm font-bold hover:bg-indigo-50 disabled:opacity-50">
                  {salvando === "agendar" ? "Agendando..." : "📅 Agendar pra esse horário"}
                </button>
                <button onClick={() => executarAcaoCanal("aprovar")} disabled={!!salvando}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
                  {salvando === "aprovar" ? "Publicando..." : "✓ Aprovar e publicar agora"}
                </button>
              </div>
            )}
            <button onClick={() => executarAcaoCanal("cancelar")} disabled={!!salvando} className="w-full text-xs text-gray-400 hover:text-red-500">
              🚫 Cancelar este post
            </button>
          </div>
        )}

        {editandoCanalUnico && canalPost && somenteLeituraCanal && (
          <div className="flex gap-2.5 mt-2">
            <button onClick={onFechar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Fechar</button>
            <button onClick={duplicarCanal} className="flex-1 border-2 border-blue-500 text-blue-700 rounded-lg py-2.5 text-sm font-bold hover:bg-blue-50">
              📋 Duplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
