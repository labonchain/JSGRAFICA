"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// Demanda 354: gestão real do Canal do WhatsApp (identidade/seguidores/
// admins/exclusão), mockup validado na 353 (ConfiguracoesCanal.dc.html).
// "Seguir outros canais" fica fora (hipótese não confirmada, ver
// pm/demandas/354-*.md) — só as ações de "Meu canal" viram código aqui.
// Sem endpoint documentado de "convidar admin" (achado registrado em
// lib/zapi.ts), por isso não existe botão de convidar.

interface MetadataCanal {
  name?: string;
  description?: string;
  picture?: string | null;
  // Achado real (354, investigação de 30/08 depois do 01-N8N reportar
  // `picture` null mesmo com foto aplicada de verdade): a Z-API/WhatsApp
  // nunca preenche `picture` na resposta de metadata (testado, confirmado
  // com foto real aplicada e visível no canal) — quem tem a URL real do
  // avatar é `preview` (thumbnail, mas é a única fonte que funciona).
  // Confirmado baixando a URL de `preview` direto: imagem real, é o selo
  // certo. Não é bug da nossa chamada de update, é só um campo que a Z-API
  // não popula nesta conta — usar sempre `picture ?? preview` pra exibir.
  preview?: string | null;
  state?: string;
  role?: string;
}

export function ConfiguracoesCanal() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetadataCanal | null>(null);
  const [seguidoresTotal, setSeguidoresTotal] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvandoIdentidade, setSalvandoIdentidade] = useState(false);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/marketing/canal/config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar configurações do Canal");
      setMetadata(data.metadata ?? null);
      setNome(data.metadata?.name ?? "");
      setDescricao(data.metadata?.description ?? "");
      // Formato de retorno de newsletter-subscribers ainda não confirmado na
      // prática (achado registrado, ver relato da 354) — tenta os formatos
      // mais prováveis (array direto, ou {total}/{count}) sem quebrar a tela.
      const seg = data.seguidores;
      if (Array.isArray(seg)) setSeguidoresTotal(seg.length);
      else if (typeof seg?.total === "number") setSeguidoresTotal(seg.total);
      else if (typeof seg?.count === "number") setSeguidoresTotal(seg.count);
      else setSeguidoresTotal(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar configurações do Canal");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarIdentidade() {
    setSalvandoIdentidade(true);
    setErro(null);
    try {
      const res = await fetch("/api/marketing/canal/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao salvar identidade do Canal");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar identidade do Canal");
    } finally {
      setSalvandoIdentidade(false);
    }
  }

  async function trocarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    setErro(null);
    try {
      const resUrl = await fetch("/api/inbox/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: arquivo.name }),
      });
      const dadosUrl = await resUrl.json();
      if (!resUrl.ok || dadosUrl.error) throw new Error(dadosUrl.error || "Erro ao gerar URL de upload");
      const { error: erroUpload } = await supabase.storage.from("inbox-media").uploadToSignedUrl(dadosUrl.path, dadosUrl.token, arquivo);
      if (erroUpload) throw new Error(erroUpload.message);
      const { data } = supabase.storage.from("inbox-media").getPublicUrl(dadosUrl.path);

      const res = await fetch("/api/marketing/canal/config", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fotoUrl: data.publicUrl }),
      });
      const dadosPatch = await res.json();
      if (!res.ok || dadosPatch.error) throw new Error(dadosPatch.error || "Erro ao trocar foto do Canal");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao trocar foto do Canal");
    } finally {
      setEnviandoFoto(false);
      e.target.value = "";
    }
  }

  async function excluirCanal() {
    setExcluindo(true);
    setErro(null);
    try {
      const res = await fetch("/api/marketing/canal/config", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmar: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao excluir o Canal");
      setConfirmandoExclusao(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir o Canal");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-300 text-center py-6">Carregando...</p>;

  return (
    <div className="space-y-4">
      {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {erro}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Meu canal</p>
        <div className="flex gap-4">
          <div className="flex-shrink-0 text-center">
            {(metadata?.picture ?? metadata?.preview) ? (
              <img src={metadata?.picture ?? metadata?.preview ?? undefined} alt="Foto do canal" className="w-18 h-18 rounded-full object-cover" />
            ) : (
              <div className="w-18 h-18 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-2xl">📢</div>
            )}
            <label className="text-[11px] font-semibold text-blue-700 mt-1.5 cursor-pointer block">
              {enviandoFoto ? "Enviando..." : "Trocar foto"}
              <input type="file" accept="image/*" className="hidden" disabled={enviandoFoto} onChange={trocarFoto} />
            </label>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nome do canal</p>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2.5 focus:outline-none focus:border-blue-400" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descrição</p>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={salvarIdentidade} disabled={salvandoIdentidade}
            className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
            {salvandoIdentidade ? "Salvando..." : "Salvar identidade"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div className="flex gap-7">
          <div>
            <div className="text-xl font-bold text-gray-800">{seguidoresTotal ?? "—"}</div>
            <div className="text-[11px] text-gray-400">seguidores</div>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 ${metadata?.state === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {metadata?.state === "ACTIVE" ? "🟢 Ativo" : metadata?.state ?? "—"}
            </span>
            <div className="text-[11px] text-gray-400 mt-1.5">estado do canal</div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl border border-red-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-red-800">Excluir canal</div>
            <div className="text-xs text-red-600 mt-0.5">Ação permanente. Todo o histórico de posts e seguidores some.</div>
          </div>
          {!confirmandoExclusao ? (
            <button onClick={() => setConfirmandoExclusao(true)} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-red-700">
              Excluir
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmandoExclusao(false)} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-xs text-gray-500">Cancelar</button>
              <button onClick={excluirCanal} disabled={excluindo} className="bg-red-600 text-white rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50">
                {excluindo ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        Gestão de administradores (convidar/remover/transferir propriedade) e &quot;Seguir outros
        canais&quot; ainda não têm tela aqui — endpoint de convite de admin não é documentado pela
        Z-API, e &quot;seguir outros canais&quot; segue como hipótese não confirmada com o Edvam
        (ver demanda 353/354).
      </p>
    </div>
  );
}
