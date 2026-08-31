# 332 - Login sem limite de tentativas (rate limit)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 03 - APP JS GRAFICA

Achado fora do escopo, relatado na demanda 329: `POST /api/auth/login-admin` aceita qualquer
número de tentativas de senha, sem trava nenhuma. Não é regressão da 329 (nunca existiu limite,
nem no mecanismo antigo), mas agora que o login é uma rota de verdade remotamente chamável, é
um alvo real pra tentativa de adivinhação por força bruta.

## Objetivo
Limitar tentativas de senha erradas por IP/janela de tempo (ex.: bloquear por alguns minutos
depois de N tentativas seguidas erradas), sem exigir infraestrutura nova pesada.

## Escopo
- Incluído: `POST /api/auth/login-admin`.
- Explicitamente fora de escopo: `login-pdv` (Zu/Gabi não têm senha, não se aplica); qualquer
  mudança no mecanismo de sessão em si (isso já foi resolvido na 329).

## Riscos e cuidados
Precisa de algum estado persistente pra contar tentativas (tabela simples ou similar) — decidir
o mecanismo mais simples que funcione, sem over-engineering pra um sistema de 3 usuários.

## Referências
`app/api/auth/login-admin/route.ts`, demanda 329 (achado original).

## Relato de execução

### O que foi feito
Contador persistido no Supabase (`jsgrafica_login_tentativas`: `chave`, `tentativas`,
`bloqueado_ate`, `atualizado_em`) — mecanismo mais simples que funciona de verdade em produção:
um contador em memória dentro da própria rota não sobreviveria entre chamadas (Vercel pode trocar
a instância da função serverless a qualquer requisição), e o sistema já é 100% Supabase-cêntrico,
sem justificar infra nova. Tabela com RLS ligado e `REVOKE ALL` de `anon`/`authenticated` (mesmo
padrão de segurança da 327) — só o `service_role` usado por `supabaseAdmin` acessa.

`chave` = IP de origem (`x-forwarded-for`, primeiro valor). Em `POST /api/auth/login-admin`: antes
de validar a senha, checa se a chave está com `bloqueado_ate` no futuro (429, sem nem chegar a
comparar a senha, nem senha certa passa durante o bloqueio — comportamento padrão de rate limit,
intencional). Senha errada incrementa `tentativas`; na 5ª errada seguida, zera o contador e grava
`bloqueado_ate = agora + 15min`. Senha certa apaga a linha inteira (contador zera, sem acumular
entre dias/tentativas esparsas de digitação errada legítima).

Fora de escopo, como já estava explícito na demanda: `login-pdv` intocado (Zu/Gabi não têm senha,
nada pra limitar ali).

### Testes realizados e resultado
Tudo com chamada HTTP real contra `admin.jsgrafica.site` em produção, depois do deploy:
- 5 tentativas seguidas com senha errada → todas 401 normalmente.
- 6ª tentativa (ainda errada) → `429 "Muitas tentativas erradas — tenta de novo em 15 minutos."`
- **Com o bloqueio ainda ativo, até a senha CERTA foi rejeitada com 429** — confirma que o
  bloqueio é de verdade, não só conta erro (efeito colateral esperado e aceito de qualquer rate
  limit: 5 erros de digitação legítimos também bloqueiam por 15min, risco assumido no desenho,
  compatível com "sem over-engineering pra 3 usuários").
- Linha de teste (`chave` = IP desta sessão de execução) apagada direto no Supabase depois do
  teste, pra não deixar o Edvam bloqueado por engano.
- Depois de limpar a linha, login com a senha certa voltou a funcionar normalmente (200, cookie
  gravado) — confirma que o mecanismo não interfere no uso normal fora de um ataque de força
  bruta de verdade.
- `npx tsc --noEmit` e `npm run build` limpos antes do deploy.

### Status final: concluída
