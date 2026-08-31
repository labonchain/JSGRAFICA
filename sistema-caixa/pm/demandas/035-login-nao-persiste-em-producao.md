# 035 — Login não persiste em produção (deslogando ao atualizar a página)

Status: aprovada — prioridade alta
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Demanda 030 (persistir login 24h) foi testada localmente com Playwright (login, reload,
expiração, logout) e passou em tudo, deployada em produção. Edvam reporta que **em produção
de verdade**, continua deslogando ao atualizar a página — a demanda 030 não resolveu isso na
prática, apesar de ter passado nos testes locais.

## Objetivo
Descobrir por que funciona local e não funciona em produção, e corrigir de verdade.

## Escopo
- Incluído: testar em produção de verdade (`admin.jsgrafica.site`), não só local — checar
  `localStorage` no navegador depois de logar e recarregar, ver se a entrada de sessão está lá
  e se está sendo lida. Hipóteses a checar: diferença de domínio/subdomínio
  (`admin.jsgrafica.site` vs `pdv.jsgrafica.site` são origins diferentes pra `localStorage` —
  confirmar se o usuário está testando no mesmo subdomínio onde logou); HTTPS/cookie policy
  diferente em produção; algum comportamento do Vercel (ex.: Edge caching de página estática
  que serve uma versão sem o `useEffect` de restauração); erro de JS específico de produção
  que não aparece em dev (checar console de erros em produção de verdade).
- Fora de escopo: mudar a abordagem de `localStorage` pra outra (cookie, JWT) a menos que a
  causa raiz exija isso — preferir consertar o que já existe primeiro.

## Critérios de aceite
- [ ] Testado em produção de verdade (não local): logar, atualizar a página, confirmar que
      continua logado
- [ ] Causa raiz identificada e corrigida (não só "funcionava local", precisa funcionar em
      produção)

## Atualização (2026-07-03) — confirmado pelo Edvam
Acontece no **computador, navegador normal** (não celular, não aba anônima). Não foi
reproduzido no teste limpo contra produção — testar cenários mais específicos: navegador
exato (Chrome/Edge/Firefox), refresh normal (F5) vs forçado (Ctrl+Shift+R), tempo parado na
aba antes de atualizar, e se ele alterna entre `admin.jsgrafica.site` e
`pdv.jsgrafica.site` (são origins diferentes pra `localStorage` — navegar de um pro outro e
voltar poderia parecer "deslogou" se ele não notar a troca de subdomínio).

## Referências
`pm/demandas/030-*.md` (implementação original), `lib/sessao.ts`.

## Relato de execução

**Status: sem reprodução — provável falso positivo (máquina/navegador diferente).**

Edvam confirmou (2026-07-03) que, testando de novo, a sessão persistiu normalmente. Bate com
a hipótese do 03-APP: nenhum cenário em produção reproduziu o bug (F5, aba parada, troca de
subdomínio) — mais provável que a queixa original tenha vindo de testar em computador/
navegador diferente do que ele logou, o que é limitação esperada de `localStorage`
(client-side, por design da demanda 030), não um bug.

Não fechando como 100% resolvido/comprovado — não há causa raiz confirmada, só ausência de
reprodução + um teste que passou depois. Se voltar a acontecer, anotar exatamente: mesmo
computador? mesmo navegador? quanto tempo entre logar e o refresh que falhou?

### Status final
Sem ação adicional por ora — monitorar.
