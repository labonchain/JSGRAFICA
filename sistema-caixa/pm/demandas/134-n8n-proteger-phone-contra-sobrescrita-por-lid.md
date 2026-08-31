# 134 — n8n: proteger `phone` contra sobrescrita por LID (mesma proteção que `lead_name` já tem)

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 01 - N8N

## Contexto
A demanda 126 corrigiu 438 contatos que tinham `phone` = LID em vez do número real (backfill).
Mas a causa raiz — o que fazia isso acontecer — estava no workflow do n8n, sem acesso confirmado
até agora (MCP reconectado em 2026-07-09, sessão do PM).

**Causa raiz confirmada, lendo o código de verdade** — workflow **"01 - JSGRAFICA | LOG MSG
RECEBIDAS"** (id `lcFEt1kbyqNfTS89`), node **"PREPARAR LOG CONTATOS"**:

O campo `lead_name` já tem proteção contra sobrescrita ruim — só atualiza se o nome novo for
válido (não vazio, não igual ao telefone/lid), senão mantém o valor que já existia:
```js
function nomeValido(nome, ...identificadores) {
  if (!nome) return false;
  const n = String(nome).trim();
  if (!n) return false;
  return !identificadores.some(id => id && n === String(id).trim());
}

const leadNameFinal = nomeValido(data.lead_name, data.phone, data.contact_lid)
  ? data.lead_name
  : (contatoExistente?.lead_name ?? null);
```

O campo `phone` **não tem essa proteção** — grava direto o que veio no evento daquela hora, sem
checar formato nem comparar com o que já existia:
```js
phone: data.phone,
```

Isso significa: toda vez que um evento novo chega (recebida ou enviada pela gráfica) com `phone`
em formato LID (`NNNN@lid` — acontece sobretudo em mensagens enviadas por vocês, confirmado:
100% de uma amostra de 1.000 eventos com `phone`=LID tinham `fromMe: true`), o número bom que já
estava salvo é sobrescrito. Sem essa correção, os 438 contatos que a 126 acabou de arrumar podem
voltar a ficar errados a qualquer momento.

## Objetivo
O campo `phone` de `jsgrafica_contatos` nunca mais é sobrescrito por um valor em formato LID —
mesma garantia que o `lead_name` já tem hoje.

## Escopo
- Incluído:
  1. No node **"PREPARAR LOG CONTATOS"** do workflow **"01 - JSGRAFICA | LOG MSG RECEBIDAS"**,
     adicionar uma função equivalente à `nomeValido()`, mas pra telefone — ex.:
     ```js
     function phoneValido(phone) {
       if (!phone) return false;
       return !String(phone).includes('@lid');
     }
     ```
  2. Trocar `phone: data.phone` por algo como:
     ```js
     phone: phoneValido(data.phone) ? data.phone : (contatoExistente?.phone ?? data.phone),
     ```
     (se não existir contato anterior nem número válido, mantém o comportamento atual — só
     protege quando já existia um número bom que seria substituído por LID).
  3. Não mexer em `contact_lid`/`conversation_id` — esses continuam sendo gravados normalmente a
     cada evento, é o comportamento correto (é o que endereça o envio, ver demanda 126).
  4. Testar com pelo menos 1 conversa real que historicamente teve o problema (ex.: qualquer um
     dos 438 contatos já corrigidos pela 126) — mandar/simular um evento com `phone`=LID pra essa
     conversa e confirmar que o `phone` da tabela **não muda**, continua com o número real.
- Fora de escopo: mexer em outros workflows de outros clientes (cada cliente tem cópia própria —
  "01 - CONECTA", "01 - BIOBOTS" etc. — confirmado que não são compartilhados). Se o PM/Edvam
  decidir replicar esse fix pros outros clientes depois, vira demanda separada.

## Critérios de aceite
- [ ] Função de proteção adicionada, espelhando a lógica já usada pro nome
- [ ] Testado: evento com `phone`=LID pra um contato que já tinha número real não sobrescreve
- [ ] Testado: evento com `phone` real continua atualizando normalmente (sem regressão)
- [ ] `contact_lid`/`conversation_id` continuam sendo gravados a cada evento, sem mudança

## Riscos e cuidados
É produção de verdade, rodando pra toda mensagem que chega/sai da JS Gráfica — testar com cuidado
antes de considerar concluído. Não mexer em nenhum outro workflow (nem "02 - LOG MSG ENVIADAS",
nem os de outros clientes).

## Referências
Demanda 126 (achado original, backfill dos 438 contatos). Esta conversa (2026-07-09) — código do
node "PREPARAR LOG CONTATOS" lido via MCP do n8n, workflow id `lcFEt1kbyqNfTS89`.

## Relato de execução

**Status final: concluída**

### O que foi feito
Backup do workflow antes de mexer. No node `PREPARAR LOG CONTATOS`, adicionada a função
`phoneValido()` (mesmo padrão da `nomeValido()` já existente) logo depois dela:

```js
function phoneValido(phone) {
  if (!phone) return false;
  return !String(phone).includes('@lid');
}

const phoneFinal = phoneValido(data.phone)
  ? data.phone
  : (contatoExistente?.phone ?? data.phone);
```

E troquei `phone: data.phone` por `phone: phoneFinal` no output. `contact_lid`/`conversation_id`
não foram tocados — continuam vindo direto de `data.contact_lid`/`data.conversation_id` a cada
evento, como pedido.

### Testes realizados
1. **Caso do bug (contato real dos 438 corrigidos pela 126):** usei `558184860661` (Douglas
   Ridrigues, `contact_lid: 15995095789640@lid`, status `resolvido` — escolhi esse e não um dos
   outros porque os primeiros que achei estavam `em_atendimento` ativo agora, não quis
   interferir). Simulei exatamente o cenário do bug: evento `fromMe:true` com `phone` vindo como
   `15995095789640@lid` (igual ao `contact_lid`). **Resultado: `phone` continuou
   `558184860661`** — não foi sobrescrito. `contact_lid` também não mudou (mesmo valor de
   antes). Restaurei os contadores (`total_mensagens_enviadas`, `total_interacoes`,
   `data_ultimo_contato`) ao valor exato de antes do teste, já que o evento sintético os
   incrementou normalmente (isso é esperado — só o `phone` tem a proteção, contagem de
   interação continua contando).
2. **Regressão (telefone real continua funcionando):** contato novo sintético com `phone` real
   (não-LID) — criado corretamente com o número certo, sem nenhuma proteção bloqueando o
   caminho normal.
3. Limpei todos os dados de teste (mensagens e contato sintético) depois.

### Critérios de aceite
- [x] Função de proteção adicionada, espelhando a lógica já usada pro nome
- [x] Testado: evento com `phone`=LID pra um contato que já tinha número real não sobrescreve
- [x] Testado: evento com `phone` real continua atualizando normalmente (sem regressão)
- [x] `contact_lid`/`conversation_id` continuam sendo gravados a cada evento, sem mudança

### Achado fora do escopo (registro, não corrigido)
`lead_phone`/`lead_phone_ddd`/`lead_phone_number` são calculados a partir do `phone` bruto do
evento (no `Processar Evento`, antes deste node) — se o evento vier com `phone`=LID, esses três
campos também saem errados/derivados do LID, e este fix não os protege (só protege a coluna
`phone` em si, como pedido no escopo). Não corrigi por não estar no escopo desta demanda — acho
que vale uma demanda futura se isso importar pro Inbox/relatórios.
