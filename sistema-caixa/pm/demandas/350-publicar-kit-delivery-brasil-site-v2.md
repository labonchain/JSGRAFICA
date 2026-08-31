# 350 - Publicar Kit Delivery Brasil no Site V2 (depois da 346 validar)

Status: aprovada
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: (vazio até conclusão)
Chat executor: 09 - SITE V2 JS GRAFICA

**Bloqueada até a demanda 346 (08-Produtos, validação dos 5 requisitos) concluir com sucesso** —
não começar antes disso. Se a 346 não validar (ex.: sinal comercial mínimo não bater), esta
demanda não deve rodar.

## Objetivo
Publicar o produto NEG-KIT-001 (Kit Delivery Brasil) no catálogo público do Site V2, seguindo o
gate cumulativo já definido: produto ativo em `jsgrafica_produtos` (criado na 346) +
`status_produto=ATIVO` + `status_publicacao=PUBLICADO` + modalidade ativa + representação visual
aprovada, categoria "Produtos digitais" (já existe na taxonomia oficial).

## Escopo
- Incluído: publicação em `jsgrafica_catalogo_publicacao`/modalidades/assets, seguindo o
  RUNBOOK-CLAUDE-PM.md (QA SQL + QA de navegador antes de considerar pronto).
- Explicitamente fora de escopo: decidir preço/licença/validação comercial (isso já veio pronto
  da 346, você só publica o que já foi aprovado).

## Riscos e cuidados
Mesmo rigor do RUNBOOK: confirmar conta Supabase/Vercel oficial antes de qualquer passo, QA SQL
obrigatório, preview isolado antes de qualquer coisa ir pro domínio de produção.

## Referências
Demanda 346 (validação), `site-v2/docs/RUNBOOK-CLAUDE-PM.md`.

## Relato de execução
(preenchido pelo 09-SITE V2 ao concluir)
