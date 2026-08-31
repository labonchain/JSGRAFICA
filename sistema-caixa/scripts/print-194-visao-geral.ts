/**
 * Demanda 194 — screenshot da "Visão Geral" nova, contra o dev server local
 * (localhost:3000, já com as mudanças), pra validação do Edvam ANTES do
 * deploy final (mesmo processo da 193). Login bypassed via localStorage
 * (mesma sessão client-side que `lib/sessao.ts` já usa — id "admin1").
 *
 *   npx tsx scripts/print-194-visao-geral.ts
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PASTA_PRINTS = resolve(__dirname, '../pm/demandas/194-prints');

// A tela rola por DENTRO de um container próprio (overflow-y-auto h-full,
// mesmo padrão do app inteiro), não no documento. Várias abas ficam
// montadas ao mesmo tempo (AbaKeepAlive, demanda 136), cada uma com seu
// próprio ".overflow-y-auto.h-full" — só a ativa tem `offsetParent` (as
// inativas viram `display:none`, via classe "hidden").
async function rolarContainerVisivel(page: import('playwright').Page, paraOnde: 'topo' | 'fim') {
  await page.evaluate((destino) => {
    const candidatos = [...document.querySelectorAll('.overflow-y-auto.h-full')];
    const visivel = candidatos.find(el => (el as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
    if (!visivel) return;
    visivel.scrollTo(0, destino === 'topo' ? 0 : visivel.scrollHeight);
  }, paraOnde);
}

async function main() {
  const browser = await chromium.launch();
  const contexto = await browser.newContext({ viewport: { width: 1600, height: 1400 }, locale: 'pt-BR' });
  const page = await contexto.newPage();

  // Sessão já autenticada — bypassa o formulário de senha (mesmo mecanismo
  // de lib/sessao.ts).
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('jsgrafica_sessao', JSON.stringify({ usuarioId: 'admin1', expiraEm: Date.now() + 24 * 60 * 60 * 1000 }));
  });
  await page.reload();
  await page.waitForTimeout(1500);

  // Navega pro grupo "Financeiro" e clica na aba "Visão Geral" — regex (não
  // exact) porque o emoji fica num <span> separado do texto no mesmo botão.
  await page.getByRole('button', { name: /Financeiro/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Visão Geral/ }).click();
  await page.waitForTimeout(2500); // carrega /api/dashboard

  // Print "acima da dobra": garante que está no topo ANTES de tirar —
  // importante pra avaliar a hierarquia visual pedida (cards + saúde do
  // caixa em destaque).
  await rolarContainerVisivel(page, 'topo');
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(PASTA_PRINTS, 'depois-01-acima-da-dobra.png') });
  console.log('Print acima-da-dobra salvo.');

  // Rola o container até o fim pra conferir a última seção (Fechamentos
  // recentes) e o restante do conteúdo secundário.
  await rolarContainerVisivel(page, 'fim');
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(PASTA_PRINTS, 'depois-02-resto-da-pagina.png') });
  console.log('Print resto-da-pagina salvo.');

  // Testa também o seletor "30 dias" (volta ao topo antes, espera mais por
  // ser uma consulta maior).
  await rolarContainerVisivel(page, 'topo');
  await page.getByRole('button', { name: '30 dias' }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(PASTA_PRINTS, 'depois-03-periodo-30-dias.png') });
  console.log('Print período 30 dias salvo.');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
