# 312, Abertura de caixa: permitir editar depois que o dia vira

Status: proposta
Criada em: 2026-08-20
Aprovada em:
Concluída em:
Chat executor: 03 - APP JS GRAFICA

## Contexto

Achado real do Edvam (19/08): a abertura de caixa da Zu foi lançada errada, e não teve como
corrigir. Confirmei a causa direto no código, não é falha de uso: `app/api/abertura-caixa/route.ts`
sempre calcula `dataDia = formatarDiaCaixa()` (o dia de hoje, no servidor), tanto no `GET` quanto
no `POST`, sem nenhum parâmetro de data. `salvarAberturaOperador` (`lib/supabase-admin.ts`) até
faz upsert de verdade (`onConflict: 'data_dia,operador'`), então corrigir no MESMO dia funcionaria
se alguém repetisse o lançamento, mas assim que o dia vira, essa rota fica permanentemente incapaz
de tocar o registro de um dia anterior. Busquei em todo o projeto (`jsgrafica_abertura_caixa`) e
não existe nenhuma outra tela/rota que edite esse registro. É lacuna real, não bug de lógica.

## Objetivo

Existe um jeito de corrigir a abertura de caixa (dinheiro/moedas contados) de um dia anterior,
sem precisar de SQL direto no banco.

## Escopo

Incluído:
- Um caminho de edição pro Admin corrigir `jsgrafica_abertura_caixa` de qualquer dia já
  fechado, não só hoje. Pode ser uma tela nova simples (buscar por data+operador, editar,
  salvar) ou um ajuste na tela que já existe pra abertura, com campo de data quando acessado
  pelo Admin (mantendo o fluxo do PDV pro operador comum igual está, só hoje, sem confusão).
- Registrar quem editou e quando (auditoria mínima, mesmo padrão já usado em outros lugares do
  sistema, ex. `bloqueado_por`/`bloqueado_em` em contatos).

Explicitamente fora de escopo:
- Recalcular fechamentos já fechados que dependeram do valor errado de abertura (se isso for
  necessário, é uma investigação separada, o Edvam decide caso a caso).

## Critérios de aceite

- [ ] Dá pra corrigir a abertura de caixa de um dia anterior pela UI, sem SQL direto.
- [ ] O fluxo normal do PDV (operador lançando a abertura de hoje) continua igual, sem
      regressão.
- [ ] Fica registrado quem editou e quando.

## Referências

`app/api/abertura-caixa/route.ts`, `lib/supabase-admin.ts` (`getAberturaOperador`,
`salvarAberturaOperador`), `components/PortaoAberturaCaixa.tsx`, tabela
`jsgrafica_abertura_caixa`. Achado do Edvam em 19/08 (abertura da Zu lançada errada).

## Relato de execução
(preenchido pelo chat executor ao concluir, ver formato exato no briefing do seu chat em
`../equipe/`)

- O que foi feito (arquivo a arquivo):
- Testes realizados e resultado:
- Achados fora do escopo (relatados, não resolvidos por conta própria):
- Status final: concluída / bloqueada (motivo) / parcial (o que falta)
