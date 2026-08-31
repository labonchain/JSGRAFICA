"use client";

import type { CanalPost } from "@/lib/canalWhatsapp";

// Demanda 354 (mockup validado na 353, ComoVaiFicar.dc.html): preview do
// Canal precisa refletir "feed permanente e rolável" (perfil fixo + linha
// do tempo em lista), diferente do carrossel de tela cheia do Status
// (ComoVaiFicarWhatsApp em TelaMarketingConteudo.tsx) — Canal não expira em
// 24h, o Status expira.

function dataHoraRecife(iso: string): string {
  return `${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit" }).format(new Date(iso))} · ${new Intl.DateTimeFormat("en-GB", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso))}`;
}

function resumoPostCanal(post: CanalPost): string {
  if (post.tipo === "text") return post.texto || "(sem texto)";
  if (post.tipo === "image") return post.caption_image || "(sem legenda)";
  return post.caption_video || "(sem legenda)";
}

export function ComoVaiFicarCanal({ posts, fotoCanal, nomeCanal, onAbrirPost }: {
  posts: CanalPost[];
  fotoCanal?: string | null;
  nomeCanal?: string | null;
  onAbrirPost: (p: CanalPost) => void;
}) {
  const linhaDoTempo = posts
    .filter(p => p.status === "published" || p.status === "approved")
    .sort((a, b) => (b.published_at ?? b.scheduled_at).localeCompare(a.published_at ?? a.scheduled_at));

  return (
    <div className="grid grid-cols-[300px_1fr] gap-5 items-start">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Perfil do canal</p>
        <div className="flex items-center gap-3">
          {fotoCanal ? (
            <img src={fotoCanal} alt={nomeCanal ?? "Canal"} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-xl flex-shrink-0">📢</div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-800">{nomeCanal ?? "JS Gráfica"}</div>
            <div className="text-xs text-gray-400">Canal do WhatsApp</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mt-4">
          Diferente do Status, o post do Canal não expira: fica no histórico até alguém apagar. Por
          isso o preview aqui é uma lista que cresce pra baixo, não uma sequência de telas cheias.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Linha do tempo do canal (mais recente primeiro)</p>
        {linhaDoTempo.length === 0 ? (
          <p className="text-xs text-gray-300">Nenhum post do Canal publicado ou agendado ainda.</p>
        ) : (
          <div className="flex flex-col">
            {linhaDoTempo.map(p => (
              <button key={p.id} onClick={() => onAbrirPost(p)} className="flex gap-3 py-3.5 border-b border-gray-100 last:border-none text-left">
                {fotoCanal ? (
                  <img src={fotoCanal} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-gray-800">{nomeCanal ?? "JS Gráfica"}</span>
                    <span className="text-[11px] text-gray-400">{dataHoraRecife(p.published_at ?? p.scheduled_at)}</span>
                    {p.status === "published" ? (
                      <span className="text-[10px] font-semibold bg-green-100 text-green-700 rounded-full px-2 py-0.5 ml-auto">Publicado</span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 ml-auto">📅 Agendado</span>
                    )}
                  </div>
                  {(p.tipo === "image" && p.image_url) && (
                    <div className="w-[220px] aspect-square rounded-lg overflow-hidden bg-gray-100 mb-1.5">
                      <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                  )}
                  {p.tipo === "video" && (
                    <div className="w-[220px] aspect-square rounded-lg bg-gray-900 mb-1.5 flex items-center justify-center text-2xl">🎥</div>
                  )}
                  <div className="text-[13px] text-gray-700">{resumoPostCanal(p)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
