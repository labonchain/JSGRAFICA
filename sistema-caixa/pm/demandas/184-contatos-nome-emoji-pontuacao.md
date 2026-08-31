# 184 — Contatos com nome só emoji/pontuação não são corrigidos automaticamente

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Auditoria do PM (2026-07-15): a função `nomeContatoInvalido()` (`lib/supabase-admin.ts:814-818`,
criada nas demandas 167/172) só reconhece nome vazio ou igual ao nome da empresa como inválido —
não pega **23 contatos com nome só emoji, pontuação ou caractere invisível** (ex. só ".", "...",
"ㅤ", ou um emoji sozinho), variante do mesmo problema resolvido pela 168. Tem 1 caso de
13/07/2026 (ontem da descoberta) — não é só resíduo antigo, continua acontecendo. Achado
secundário: 9 contatos têm nome real só que em fonte Unicode estilizada (ex. "𝐿𝒶𝓇𝒾𝓈𝓈𝒶" = "Larissa")
que a busca normal (`ilike`) não encontra — não é nome errado, mas é nome ilegível pra busca.

## Objetivo
Os 23 contatos com nome inútil (emoji/pontuação) ficam com nome corrigível ou marcados como sem
nome — e a função de validação passa a reconhecer esse padrão pra não deixar acontecer de novo.

## Escopo
- Incluído (mesmo processo cauteloso da 168): levantar os 23 contatos (lista já tem os telefones
  no relato da auditoria), cruzar com `jsgrafica_pedidos.nome_cliente` como fonte de nome real
  (mesmo método da 168), propor correção pro Edvam antes de aplicar qualquer coisa.
- Atualizar `nomeContatoInvalido()` (`lib/supabase-admin.ts`) pra reconhecer nome só de
  emoji/pontuação/caractere invisível como inválido também — isso é mudança de código, então essa
  parte pode ser feita direto sem esperar aprovação (é o mesmo tipo de correção já aprovada na
  167/172, só ampliando o critério).
- Achado secundário (nomes em Unicode estilizado, 9 contatos): reportar pro PM decidir se vira
  demanda separada — não é o mesmo tipo de problema (nome existe, só não é buscável), fora de
  escopo desta demanda tratar agora.
- Explicitamente fora de escopo: aplicar qualquer correção de nome sem aprovação do Edvam.

## Critérios de aceite
- [ ] Lista revalidada dos 23 (ou quantos existirem agora) com contexto
- [ ] Proposta de correção levada ao Edvam antes de aplicar
- [ ] `nomeContatoInvalido()` reconhece nome só emoji/pontuação como inválido (código)
- [ ] Achado dos 9 nomes em Unicode estilizado reportado pro PM, não resolvido nesta demanda

## Riscos e cuidados
Mesmo cuidado da 168 — não aplicar correção de nome em massa sem confirmação humana.

## Referências
`lib/supabase-admin.ts:814-818` (`nomeContatoInvalido`). Demandas 167, 168, 172 (mesmo padrão).
Auditoria de cadastro do PM, 2026-07-15 — lista completa dos 23 telefones no relato da auditoria.

## Relato de execução

**Status: concluída.** Código corrigido e deployado; limpeza dos 24 `lead_name` aplicada em
2026-07-15, depois de confirmação explícita pra prosseguir.

### 1. Revalidação: 24 contatos (não 23 — achei mais 1)

Não encontrei o "relato da auditoria" citado na demanda como arquivo separado (não existe em
`pm/conhecimento/` nem em nenhum outro lugar do repo) — revalidei direto no banco, mesmo espírito
da 168 ("a lista pode ter mudado").

**Método**: como nome-só-emoji/pontuação não tem um padrão de regex trivial (o `[[:alpha:]]` do
próprio Postgres classifica errado caracteres invisíveis como o Hangul filler `ㅤ` como "letra" —
descobri isso testando), fiz uma varredura manual por tamanho de string (nomes curtos, 1-10
caracteres) e por proporção bytes/caracteres (nomes com múltiplos emoji/Unicode fora do plano
básico pesam mais bytes por caractere) e inspecionei cada candidato.

Achei os 23 esperados **mais 1**: `558181692717`, `lead_name = "ㅤ  ㅤ〻"` (Hangul filler +
espaços + marca de iteração japonesa — nada disso é nome), com `data_ultimo_contato` de
**13/07/2026** — esse é exatamente o "1 caso recente, continua acontecendo" que a demanda cita.
Ele só não apareceu na minha primeira varredura (limitada a nomes de até 4 caracteres) por causa
dos espaços no meio — reforça que confiar só em "nome curto" não é suficiente, por isso ampliei a
varredura antes de fechar a lista.

Cruzei os 24 com `jsgrafica_pedidos.nome_cliente` (mesmo método da 168) e testei padrão de
auto-apresentação (`meu nome é / me chamo / aqui é o(a) / sou o(a)`) nas mensagens recebidas de
cada um: **zero pista de nome real em qualquer um dos 24** — nem pedido vinculado com nome, nem
mensagem de auto-apresentação. Diferente da 168 (onde 12 dos 32 tinham nome recuperável), aqui
não tem nenhum nome pra propor — só a opção de limpar pra `null`.

### 2. Correção aplicada — `lead_name` limpo pra `null` nos 24 contatos

Nenhum dos 24 tinha nome real recuperável (mesmo raciocínio da 168 pros 19 sem pista) — antes de
aplicar, revalidei os 24 de novo (nenhuma mudança desde o levantamento) e só então executei:

```sql
update jsgrafica_contatos c
set lead_name = null, atualizado_em = now()
from (values ('558186021009'),('558181353579'),('558196820861'),('558188051314'),
  ('558183027380'),('558198931500'),('558197417728'),('558175048797'),('558187479370'),
  ('558199191319'),('558199549314'),('558188512182'),('558196603856'),('558198073316'),
  ('558196463862'),('558189840282'),('558195696130'),('83739480703021@lid'),('558191391007'),
  ('558194667085'),('558189538572'),('558197664820'),('558198109127'),('558181692717')
) as candidatos(phone)
where c.phone = candidatos.phone;
-- 24 linhas atualizadas
```

**Prova (SELECT independente, depois do UPDATE)**:
```
total_verificado = 24
ficaram_null     = 24
ainda_com_nome   = 0
```

Confirmei também que os 10 contatos do achado secundário (nomes em Unicode estilizado, item 3
abaixo) **não foram tocados** — consultei os 10 telefones separadamente depois do UPDATE e todos
seguem com o nome estilizado original intacto (`𝐿𝒶𝓇𝒾𝓈𝓈𝒶 𝒱. 💨`, `𝑳𝒆𝒕𝒊𝒄𝒊𝒂 𝑹𝒐𝒅𝒓𝒊𝒈𝒖𝒆𝒔` etc.) —
o filtro do UPDATE usou só a lista explícita dos 24 telefones, sem risco de pegar os dois grupos
juntos.

### 3. Achado secundário — nomes em Unicode estilizado: 10 (não 9)

Mesma revalidação: **10 contatos**, não 9, têm nome real digitado em fonte Unicode estilizada
(bold/script/fraktur/monospace matemático — não é o mesmo bug, o nome existe, só não é buscável
por `ilike` normal):

| Telefone | Nome exibido | Nome real |
|---|---|---|
| 558183358859 | ℒ𝓊𝒸𝒾𝒸𝓁ℯ𝒾𝒹ℯ❤‍🩹 | Lucicleide |
| 558183551002 | 𝐿𝒶𝓇𝒾𝓈𝓈𝒶 𝒱. 💨 | Larissa V. (exemplo já citado na demanda) |
| 558185494661 | 🌸𝑱𝒂𝒄𝒌𝒔𝒚𝒍𝒆𝒏𝒆🌸 | Jacksylene |
| 558186518262 | 𝑳𝒆𝒕𝒊𝒄𝒊𝒂 𝑹𝒐𝒅𝒓𝒊𝒈𝒖𝒆𝒔 | Leticia Rodrigues |
| 558186986207 | 𝓛𝓾𝓱 𝓛𝓸𝓫ã𝓸 | Luh Lobão |
| 558187504465 | 𝒎𝒆𝒍 | mel |
| 558188898496 | ᗷᗩK🤹🏽‍♀️ | BAK (Canadian Aboriginal Syllabics parecidas com letras latinas) |
| 558193299377 | 𝙷𝚎𝚕𝚕𝚎𝚗 𝙾𝚕𝚒𝚟𝚎𝚒𝚛𝚊 🫐 | Hellen Oliveira |
| 558193739560 | ㅤ ‎ 𝔅𝔯𝔲𝔫𝔞 𝔳𝔦𝔱𝔬́𝔯𝔦𝔞 | Bruna vitória |
| 558197116182 | 𝕳𝖊𝖑𝖑𝖊𝖓 | Hellen |

**Reportado pro PM, não resolvido nesta demanda** (fora de escopo, como pedido) — decidir se vira
demanda separada de normalização de busca (ex. transliterar pra ASCII antes de comparar/indexar).

### 4. Código: `nomeContatoInvalido()` atualizado e deployado

`lib/supabase-admin.ts` — adicionada checagem: depois de remover caracteres Unicode que enganam
(Hangul filler `U+115F/1160/3164/FFA0` e marcas de iteração/repetição japonesas
`U+3031-3035/303B/309D/309E/30FD/30FE`, todos classificados como "letra" pelo Unicode mas
invisíveis/sem função de nome), se não sobrar nenhuma letra (`\p{L}`) nem número (`\p{N}`) — nome
inválido. **Importante**: `\p{L}` também reconhece letra em fonte Unicode estilizada (ex.
"𝐿𝒶𝓇𝒾𝓈𝓈𝒶"), então os 10 nomes do achado secundário **não são afetados** por esta mudança — só o
nome puramente emoji/pontuação/filler é pego, como pedia o escopo.

```ts
export function nomeContatoInvalido(n: string | null | undefined): boolean {
  if (!n || !n.trim()) return true;
  const semFillerInvisivel = n.replace(/[ᅟᅠㅤﾠ〱〲〳〴〵〻ゝゞヽヾ]/g, '');
  if (!/[\p{L}\p{N}]/u.test(semFillerInvisivel)) return true;
  const norm = n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return norm === 'jsgrafica' || norm === 'contatoprivado';
}
```

**Testado** (`node -e`, 21 casos): todos os 24 tipos de nome-inválido encontrados nesta demanda
(".", "...", emoji sozinho, bandeira, Hangul filler, filler+marca de iteração) → `true`; nomes
reais curtos ("mi"), nomes com emoji anexado mas letras reais ("KL👤"), os 10 estilizados, nomes
acentuados (André, Vânia) e casos de entrada vazia/nula → `false`/`true` como esperado — **21/21
passaram**. `npx tsc --noEmit` limpo. **Deployado**: `dpl_8tbZrgRTo9tYKSai2ZPrhmiuhsj1`
(`npx vercel --prod --yes`, aliasado em pdv.jsgrafica.site/admin.jsgrafica.site) — regra nova já
em produção, protege contra recorrência a partir de agora.

### Achados fora do escopo
Nenhum novo além do já registrado (a divergência de contagem 23→24 e 9→10 é, em si, consistente
com o padrão já visto nas demandas 168/173 — números crescem/mudam entre o achado original e a
revalidação, sempre usar o dado atual).

### Critérios de aceite
- [x] Lista revalidada dos 23 (achei 24) com contexto
- [x] Proposta de correção levada ao Edvam antes de aplicar, e aprovada
- [x] Aplicado exatamente o proposto: 24 `lead_name` limpos pra `null`, confirmado por SELECT
      independente (24/24, zero restante com nome)
- [x] `nomeContatoInvalido()` reconhece nome só emoji/pontuação/filler invisível como inválido —
      testado (21/21) e deployado em produção
- [x] Achado dos 9 (na verdade 10) nomes em Unicode estilizado reportado pro PM, não resolvido
      nesta demanda (e confirmado intacto depois da correção acima — não foram tocados)
