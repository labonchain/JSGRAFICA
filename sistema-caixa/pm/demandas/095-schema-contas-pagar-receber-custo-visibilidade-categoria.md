# 095 — Schema novo: preço de custo, visibilidade de categoria por perfil, tabela Contas a Pagar/Receber

Status: concluída (verificado pelo PM em produção — colunas conferidas via REST, RLS testada com tentativa real de INSERT via chave anônima, bloqueada 401)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Primeira peça da reestruturação do módulo Financeiro (grupo "💰 Financeiro" vai de 3 pra 5
abas), decidida em conversa longa com o Edvam — ver `pm/conhecimento/proposta-fluxo-financeiro.md`
e `pm/conhecimento/checklist-reestruturacao-financeiro.md` (itens A1, A2, A3 do Bloco A — pode
ir a qualquer momento, é só schema novo, não muda nada do que já está em uso).

## Objetivo
Criar os campos/tabela de banco que sustentam: (1) margem de lucro por produto, (2) categorias
de saída visíveis só pro Admin vs. também pro PDV, (3) cadastro de contas a pagar/receber com
recorrência.

## Escopo
- Incluído:
  1. **Coluna `preco_custo`** em `jsgrafica_produtos` — numeric, nullable (todos os 41 produtos
     começam sem valor, preenchidos aos poucos pelo Edvam). Vale pra **todos** os produtos, sem
     exceção — confirmado pelo Edvam, mesmo produção própria (impressão) usa isso pra métrica de
     margem/lucro nos relatórios, não só produtos com repasse a terceiro.
  2. **Coluna `visivel_pdv`** em `jsgrafica_categorias_saida` — boolean, default `false` (nenhuma
     categoria aparece pro PDV até o Admin marcar explicitamente). Confirmar as 12 categorias
     existentes com o Edvam antes de decidir o default de cada uma, ou deixar todas `false` e ele
     liga manualmente as que quiser (mais seguro, evita presumir).
  3. **Tabela nova `jsgrafica_contas_pagar_receber`**, campos:
     - `id` (uuid, pk)
     - `nome` (text) — ex. "Aluguel"
     - `valor` (numeric)
     - `categoria` (text) — reaproveitar o mesmo conceito de categoria livre que `jsgrafica_saidas`
       já usa, não precisa ser FK pra `jsgrafica_categorias_saida` (contas a pagar podem ter
       categorias diferentes de saída operacional, ex. "Impostos", "Fornecedores")
     - `tipo` (text, check `'pagar'` ou `'receber'`)
     - `vencimento` (date)
     - `status` (text, check `'pendente'`, `'pago'`, `'atrasado'` — `'atrasado'` pode ser
       calculado em tempo de leitura comparando `vencimento` com hoje, não precisa ser um valor
       gravado que alguém tem que atualizar manualmente; decidir com 03-APP qual abordagem, mas
       registrar a coluna preparada pra ambas)
     - `recorrente` (boolean, default `false`)
     - `frequencia` (text, nullable — `'mensal'` por enquanto, é o único caso real do Edvam;
       deixar como texto livre em vez de enum fechado pra não precisar de migration nova se
       aparecer semanal/anual depois)
     - `saida_vinculada_id` (uuid, nullable, FK solta pra `jsgrafica_saidas.id` — preenchido só
       quando a baixa gerar uma saída real)
     - `venda_vinculada_id` / `pedido_vinculado_id` (nullable — mesma ideia, pro lado "receber";
       confirmar com 03-APP qual tabela faz mais sentido vincular, `jsgrafica_vendas` ou
       `jsgrafica_pedidos`)
     - `operador` (text — quem cadastrou)
     - `created_at`, `updated_at`
  4. RLS travada igual todas as tabelas `jsgrafica_*` (mesmo padrão da demanda 025) — não deixar
     essa nova tabela aberta por esquecimento.
- Fora de escopo: a lógica de baixa automática (gerar a saída/entrada real ao marcar como pago) —
  isso é demanda separada (096), do 03-APP. Aqui é só schema.

## Critérios de aceite
- [ ] `preco_custo` existe em `jsgrafica_produtos`, nullable, sem quebrar nenhum produto existente
- [ ] `visivel_pdv` existe em `jsgrafica_categorias_saida`, default `false`, 12 categorias
      existentes intactas
- [ ] `jsgrafica_contas_pagar_receber` criada com os campos acima, RLS travada (testar com chave
      anônima, mesmo padrão da 025)
- [ ] Nenhum dado existente alterado ou perdido

## Riscos e cuidados
Mudança puramente aditiva — não precisa esperar horário seguro, pode ir a qualquer momento sem
afetar quem está usando o sistema agora. Cuidado só com RLS (não esquecer de travar a tabela
nova, é erro que já aconteceu antes nesse projeto).

## Referências
`jsgrafica_produtos`, `jsgrafica_categorias_saida`, `jsgrafica_saidas`, `jsgrafica_vendas`,
`jsgrafica_pedidos`. `pm/conhecimento/checklist-reestruturacao-financeiro.md` (itens A1/A2/A3).
Demanda 025 (padrão de RLS), demanda 049 (padrão de tabela de categoria).

## Relato de execução

### O que foi feito

```sql
-- A1
ALTER TABLE jsgrafica_produtos ADD COLUMN preco_custo numeric NULL;

-- A2
ALTER TABLE jsgrafica_categorias_saida ADD COLUMN visivel_pdv boolean NOT NULL DEFAULT false;

-- A3
CREATE TABLE jsgrafica_contas_pagar_receber (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                text NOT NULL,
  valor               numeric NOT NULL,
  categoria           text NOT NULL,
  tipo                text NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  vencimento          date NOT NULL,
  status              text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  recorrente          boolean NOT NULL DEFAULT false,
  frequencia          text NULL,
  saida_vinculada_id  uuid NULL REFERENCES jsgrafica_saidas(id),
  venda_vinculada_id  uuid NULL REFERENCES jsgrafica_vendas(id),
  pedido_vinculado_id text NULL REFERENCES jsgrafica_pedidos(id),
  operador            text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jsgrafica_contas_pagar_receber ENABLE ROW LEVEL SECURITY;
```

**Achado antes de gravar, mudou o desenho:** o campo `venda_vinculada_id / pedido_vinculado_id`
da demanda estava descrito como se fosse decidir entre um ou outro. Conferi ao vivo os tipos de
`id` das tabelas candidatas e **não são uniformes**: `jsgrafica_vendas.id` é `uuid`, mas
`jsgrafica_pedidos.id` (e `jsgrafica_produtos.id`) são `text`. Criei os **dois campos**
(`venda_vinculada_id uuid` + `pedido_vinculado_id text`, cada um com FK solta pra sua tabela) em
vez de escolher um só — não custa nada ter os dois nullable, e evita bloquear o 03-APP
enquanto não decidem qual usar. `saida_vinculada_id` é `uuid`, igual `jsgrafica_saidas.id`.

### Testes realizados e resultado
```
jsgrafica_produtos:        100 produtos, 0 com preco_custo preenchido (nenhum quebrado)
jsgrafica_categorias_saida: 15 categorias, todas visivel_pdv = false (nenhuma quebrada)
jsgrafica_contas_pagar_receber: RLS ligada = true
SELECT com chave anônima:  rows=0, error=null (bloqueado, mesmo padrão das demais)
```
Schema da tabela nova conferido coluna a coluna via `information_schema` — bate exatamente com
o desenho acima (tipos, nullable, defaults, checks).

Nota: a contagem é 100 produtos e 15 categorias (não 41/12 como as demandas de referência
citavam) — cresceu desde então (novos produtos/categorias cadastrados em demandas
intermediárias). Não afeta o resultado, só registrando que a base já não é a mesma "foto" das
demandas 049/056.

### Achados fora do escopo
Nenhum.

### Status final
**Concluída.** As 3 mudanças (A1/A2/A3) aplicadas, aditivas, RLS travada, nada existente
alterado ou quebrado. Destrava 096/097/102/104 do 03-APP.
