import type { CatalogMode } from "./types";

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatModePrice(mode: CatalogMode) {
  if (mode.modo_preco === "SOB_CONSULTA") return "Sob consulta";
  if (mode.preco == null) return "Condição a confirmar";
  if (mode.modo_preco === "A_PARTIR_DE") return `A partir de ${formatBRL(mode.preco)}`;
  return formatBRL(mode.preco);
}

export function labelMode(type: CatalogMode["tipo"]) {
  const labels: Record<CatalogMode["tipo"], string> = {
    DIGITAL: "Digital",
    PERSONALIZADO: "Personalizado",
    IMPRESSO: "Impresso",
    PERSONALIZADO_IMPRESSO: "Personalizado + impresso",
    IMPRESSO_ENVIO: "Impresso + envio",
    FISICO: "Pronta entrega",
  };
  return labels[type];
}

const TITLE_CASE_LOWERCASE_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "ou", "com", "sem", "em", "para", "pra", "até"]);
const TITLE_CASE_ACRONYMS = new Set(["rg", "cis", "cpf", "mei", "vem", "pix"]);

// Correções de grafia conhecidas na lista de preço interna do PDV (não é seguro
// editar jsgrafica_produtos.nome direto, é dado operacional compartilhado com o
// caixa). Chave é a palavra sem acento/pontuação, em minúsculas.
const TITLE_CASE_WORD_FIXES: Record<string, string> = {
  ima: "Ímã",
  ate: "até",
};

function capitalizeFirstLetter(word: string) {
  return word.replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (_, pre, first) => pre + first.toLocaleUpperCase("pt-BR"));
}

const TITLE_CASE_SLASH_ABBREVIATIONS: Record<string, string> = { c: "com ", s: "sem ", p: "pra " };

// Nomes de produto vêm em CAIXA ALTA da lista de preço interna do PDV; isso
// deixa o texto legível como título de cliente sem alterar o dado de origem.
export function titleCase(text: string) {
  return text
    .toLocaleLowerCase("pt-BR")
    .replace(/\b([csp])\/(?=\w)/gi, (_, letter) => TITLE_CASE_SLASH_ABBREVIATIONS[letter.toLowerCase()])
    .replace(/\//g, " / ")
    .split(/\s+/)
    .map((word, i) => {
      if (word === "/") return word;
      const clean = word.replace(/[^\p{L}\p{N}]/gu, "");
      if (TITLE_CASE_WORD_FIXES[clean]) return word.replace(new RegExp(clean, "i"), TITLE_CASE_WORD_FIXES[clean]);
      if (TITLE_CASE_ACRONYMS.has(clean)) return word.replace(new RegExp(clean, "i"), clean.toUpperCase());
      if (/^a[3-5]$/.test(clean)) return word.replace(/a[3-5]/i, clean.toUpperCase());
      const clauseStart = i === 0 || word.startsWith("(");
      if (!clauseStart && TITLE_CASE_LOWERCASE_WORDS.has(clean)) return word;
      return capitalizeFirstLetter(word);
    })
    .join(" ");
}
