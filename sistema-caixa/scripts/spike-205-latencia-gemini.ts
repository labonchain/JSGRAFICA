/**
 * Demanda 205 — mede a latência REAL de analisarMidiaGemini() (203), pra
 * compor a projeção de tempo da jornada automatizada. Reaproveita a mesma
 * amostra de 13 mídias reais do spike-203-gemini-midia.ts, só adicionando
 * cronometragem. NÃO é chamado por nenhuma tela nem pelo n8n — só roda
 * manualmente:
 *
 *   npx tsx scripts/spike-205-latencia-gemini.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// Mesma amostra exata da demanda 203 (13 mídias reais).
const AMOSTRA: { id: string; url: string }[] = [
  { id: 'img-1', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC88165C6A46275D26A9FDAE7B173082/ofxeCeE1-6cmlQvDyuKgjg==.jpg' },
  { id: 'img-2', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC656C7DA13E79AB4AD56ADBC0DD525A/h_GFBKdzjJLdKPJeYxybeQ==.jpg' },
  { id: 'img-3', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC309B44C25F853B84E06F414256DBD1/mFGNwZE0-ql9FTtsX1obFQ==.jpg' },
  { id: 'img-4', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/4A3CB694B4D03680127F/2Pdgjqdbq8UVxcVm5sihYA==.jpg' },
  { id: 'img-5', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACA06C3B1279577C7040DB594EE85056/IJuOr19taKr3spH_Qzw3rQ==.jpg' },
  { id: 'pdf-1pg-1', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC8FC3312CFB75BB3FC4875D4D71F963/g5vLMfuXL7-9BWOmZYfAXA==.pdf' },
  { id: 'pdf-1pg-2', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC146673873DE2593B657955E16B1A36/0iN1Nh42b2rDnjvnN9ghEA==.pdf' },
  { id: 'pdf-1pg-3', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC08C980FEB5BC3C981A60936D179271/28VCFabJUs_fQsM5apKc7Q==.pdf' },
  { id: 'pdf-1pg-4', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACC995CF6033AD28E787910F36E5C361/bLAlbibsYqCJ5meOJCabag==.pdf' },
  { id: 'pdf-1pg-5', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACE3A4959899B1C2EE61FCE21E53C0AB/BYoTvJfmRv_hEHWJDgQpvA==.pdf' },
  { id: 'pdf-multi-2pg', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/AC6A3D319F7D891F9604029948079E5F/KnPY7_E056zMK7WH_xDE9g==.pdf' },
  { id: 'pdf-multi-3pg', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/ACCE768A412B10C1E953668C9D878F8F/9VjBz2oFA-sxqV-9qMyhYg==.pdf' },
  { id: 'pdf-multi-7pg', url: 'https://f004.backblazeb2.com/file/temp-file-download/instances/3EFA4C62C755F07164E46237BF5854B6/3EB089540095CD0D34F7A5/N0-AxlWniWiWdZIsox7x7g==.pdf' },
];

async function main() {
  const { analisarMidiaGemini } = await import('../lib/gemini');
  const tempos: number[] = [];
  for (const item of AMOSTRA) {
    const inicio = Date.now();
    try {
      await analisarMidiaGemini(item.url);
      const ms = Date.now() - inicio;
      tempos.push(ms);
      console.log(JSON.stringify({ id: item.id, ms, s: (ms / 1000).toFixed(2) }));
    } catch (e) {
      const ms = Date.now() - inicio;
      console.log(JSON.stringify({ id: item.id, ms, erro: e instanceof Error ? e.message : String(e) }));
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  const ordenado = [...tempos].sort((a, b) => a - b);
  const mediana = ordenado[Math.floor(ordenado.length / 2)];
  const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
  const max = Math.max(...tempos);
  const min = Math.min(...tempos);
  console.log('---RESUMO---');
  console.log(JSON.stringify({ chamadas_ok: tempos.length, de: AMOSTRA.length, mediana_ms: mediana, media_ms: Math.round(media), min_ms: min, max_ms: max }));
}

main();
