/**
 * Demanda 203 — spike técnico ISOLADO: prova se o Gemini lê imagem/PDF de
 * verdade a partir de mídia REAL do sistema (jsgrafica_log_msgs_privadas).
 * NÃO é chamado por nenhuma tela nem pelo n8n — só roda manualmente:
 *
 *   npx tsx scripts/spike-203-gemini-midia.ts
 *
 * Não altera nada em produção além de ler URLs de mídia já públicas (mesmas
 * URLs que o WhatsApp/Z-API já expõem) e chamar a API do Gemini.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mesmo padrão dos outros scripts standalone do projeto (scripts/import-historico.mjs)
// — lê .env.local manualmente, sem depender do pacote dotenv (não instalado).
function loadEnv() {
  try {
    const text = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 0 || line.trim().startsWith('#')) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  } catch { /* ignorar */ }
}
loadEnv();

// Amostra de 13 mídias reais (jsgrafica_log_msgs_privadas, imagens/PDFs sem
// legenda recebidos de clientes de verdade, 13-16/07/2026) — variada:
// 5 imagens (ambíguas por natureza — foto solta), 5 PDFs de 1 página
// (ground truth do Z-API: `page_count=1`, candidatos a "documento óbvio"),
// 3 PDFs multi-página (ground truth 2/3/7 páginas — testa se o Gemini conta
// direito e reconhece como não-1-página).
const AMOSTRA: { id: string; tipo: string; paginasReais: number | null; url: string }[] = [
  { id: 'img-1', tipo: 'imagem', paginasReais: null, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC88165C6A46275D26A9FDAE7B173082/ofxeCeE1-6cmlQvDyuKgjg==.jpg' },
  { id: 'img-2', tipo: 'imagem', paginasReais: null, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC656C7DA13E79AB4AD56ADBC0DD525A/h_GFBKdzjJLdKPJeYxybeQ==.jpg' },
  { id: 'img-3', tipo: 'imagem', paginasReais: null, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC309B44C25F853B84E06F414256DBD1/mFGNwZE0-ql9FTtsX1obFQ==.jpg' },
  { id: 'img-4', tipo: 'imagem', paginasReais: null, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/4A3CB694B4D03680127F/2Pdgjqdbq8UVxcVm5sihYA==.jpg' },
  { id: 'img-5', tipo: 'imagem', paginasReais: null, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACA06C3B1279577C7040DB594EE85056/IJuOr19taKr3spH_Qzw3rQ==.jpg' },
  { id: 'pdf-1pg-1', tipo: 'pdf', paginasReais: 1, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC8FC3312CFB75BB3FC4875D4D71F963/g5vLMfuXL7-9BWOmZYfAXA==.pdf' },
  { id: 'pdf-1pg-2', tipo: 'pdf', paginasReais: 1, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC146673873DE2593B657955E16B1A36/0iN1Nh42b2rDnjvnN9ghEA==.pdf' },
  { id: 'pdf-1pg-3', tipo: 'pdf', paginasReais: 1, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC08C980FEB5BC3C981A60936D179271/28VCFabJUs_fQsM5apKc7Q==.pdf' },
  { id: 'pdf-1pg-4', tipo: 'pdf', paginasReais: 1, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACC995CF6033AD28E787910F36E5C361/bLAlbibsYqCJ5meOJCabag==.pdf' },
  { id: 'pdf-1pg-5', tipo: 'pdf', paginasReais: 1, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACE3A4959899B1C2EE61FCE21E53C0AB/BYoTvJfmRv_hEHWJDgQpvA==.pdf' },
  { id: 'pdf-multi-2pg', tipo: 'pdf', paginasReais: 2, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC6A3D319F7D891F9604029948079E5F/KnPY7_E056zMK7WH_xDE9g==.pdf' },
  { id: 'pdf-multi-3pg', tipo: 'pdf', paginasReais: 3, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACCE768A412B10C1E953668C9D878F8F/9VjBz2oFA-sxqV-9qMyhYg==.pdf' },
  { id: 'pdf-multi-7pg', tipo: 'pdf', paginasReais: 7, url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/3EB089540095CD0D34F7A5/N0-AxlWniWiWdZIsox7x7g==.pdf' },
];

async function main() {
  const { analisarMidiaGemini } = await import('../lib/gemini');
  const resultados: unknown[] = [];
  for (const item of AMOSTRA) {
    try {
      const r = await analisarMidiaGemini(item.url);
      const paginasBatem = item.paginasReais === null
        ? '—'
        : (r.numeroPaginas === item.paginasReais ? 'SIM' : `NÃO (Gemini disse ${r.numeroPaginas})`);
      const linha = {
        id: item.id, tipoEsperado: item.tipo, paginasReais: item.paginasReais,
        tipoMidiaGemini: r.tipoMidia, numeroPaginasGemini: r.numeroPaginas, paginasBatem,
        classificacao: r.classificacao, produtoOuValorDetectado: r.produtoOuValorDetectado,
      };
      resultados.push(linha);
      console.log(JSON.stringify(linha));
    } catch (e) {
      const linha = { id: item.id, erro: e instanceof Error ? e.message : String(e) };
      resultados.push(linha);
      console.log(JSON.stringify(linha));
    }
    // pequena pausa entre chamadas pra não estourar rate limit do plano do Gemini
    await new Promise(r => setTimeout(r, 1500));
  }
}

main();
