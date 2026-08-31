# DEVLOG — Caixa JS Gráfica

Registro cronológico de mudanças, testes, erros e melhorias do sistema.

---

## [2026-05-02] — Migração Sheets → Supabase + Deploy

### O que foi feito
- Criadas as tabelas no Supabase (LabON · `arqkdnexpederquztegn`):
  - `jsgrafica_vendas` — itens vendidos (produto, qtd, valor_unit, total, operador, data_dia)
  - `jsgrafica_saidas` — despesas (categoria_id, categoria_nome, valor, descricao, operador, data_dia)
  - `jsgrafica_fechamento` — fechamento diário (saldo_anterior, entradas, saídas, físico contado, divergência)
- Criado `lib/supabase.ts` com cliente Supabase, `formatarDiaCaixa()`, `getSaldoAnterior()`, `getResumoDia()`
- Migradas todas as 6 rotas de API do Google Sheets para Supabase:
  - `/api/vendas` — GET lista do dia, POST insere venda (busca nome/preço em `jsgrafica_produtos`)
  - `/api/saidas` — GET lista do dia, POST insere saída
  - `/api/fechamento` — GET resumo do dia, POST fecha caixa (upsert por data_dia)
  - `/api/log` — GET log de vendas com filtro ?mes=MM-AA
  - `/api/movimento` — GET movimento do dia agrupado por produto
  - `/api/dashboard` — GET dados históricos + top produtos + saídas por categoria
- Deletados `lib/sheets.ts` e (erroneamente) `lib/dados.ts`
- Recriado `lib/dados.ts` com IDs corretos do Supabase (`prod-001` a `prod-041`)
- GRUPOS nos dois pages atualizados para usar IDs `prod-xxx`
- Autenticação revisada:
  - PDV (`pdv.jsgrafica.site`): seleção de nome por botão (Edvam, Zu, Gabi)
  - Admin (`admin.jsgrafica.site`): senha (só Edvam)
- Variáveis de ambiente adicionadas ao Vercel
- `.env.local` criado localmente para build local funcionar
- Deploy realizado com sucesso

### Estado após deploy
- PDV funcional e exibindo produtos corretamente ✅
- Supabase vazio — nenhuma venda/saída/fechamento registrados ainda
- Dashboard mostra R$ 0,00 (esperado — banco novo, sem histórico importado)
- Histórico do Google Sheets **não importado** — pendente

### Erros encontrados e corrigidos
| Erro | Causa | Solução |
|------|-------|---------|
| `Module not found: Can't resolve '@/lib/dados'` | `lib/dados.ts` deletado mas pages ainda importavam | Recriado com IDs Supabase |
| `supabaseUrl is required` no build | `.env.local` ausente localmente | Criado `.env.local` com credenciais |
| IDs de produto incompatíveis | GRUPOS usavam `xerox_pb_a4` mas Supabase tem `prod-036` | GRUPOS atualizados nos dois pages |
| Data invertida no log (`26/05/02`) | `split('-').reverse().join('/')` inverte DD-MM-AA para AA-MM-DD | Removido `.reverse()` — agora `DD/MM/AA` correto |

### Produtos não migrados (ausentes do Supabase)
Os seguintes produtos existiam no sistema antigo mas não estão em `jsgrafica_produtos`:
- agendamento, cadastro_bo, envio_docs, matricula, digitacao_provas, scanner (Serviços)
- envelope_a4, topo_bolo, rifa (Recargas/Outros)

**Ação necessária:** adicionar via futura aba de Produtos no admin.

---

## Backlog de testes a fazer

- [x] Fazer uma venda no PDV e confirmar que aparece em `jsgrafica_vendas` — **OK** (02/05/26, Zu, XEROX COLORIDA A4 R$1,00)
- [x] Lançar uma saída e confirmar que aparece em `jsgrafica_saidas` — **OK** (POST `/api/saidas` retornou `success: true`, registro confirmado no Supabase)
- [x] Fechar caixa e confirmar upsert em `jsgrafica_fechamento` — **OK** (POST `/api/fechamento` retornou `success: true` com `saldoAcumulado` correto)
- [ ] Verificar se o saldo acumulado carrega corretamente no dia seguinte — pendente (testar em 03/05/26)
- [ ] Testar login com senha errada no admin — requer browser (não testável via API)
- [ ] Testar PDV no celular (responsividade) — requer browser mobile
- [x] Verificar se admin.jsgrafica.site está abrindo corretamente — **OK** (HTTP 200)
- [x] GET `/api/movimento` — **OK** (agrupa por produto, mostra operadores)
- [x] GET `/api/dashboard?periodo=hoje` — **OK** (entradas, saídas, histórico, top produtos)
- [x] GET `/api/log?mes=05-26` — **OK** (mas data estava invertida — corrigido)

---

## Pendências técnicas

| Item | Prioridade | Notas |
|------|-----------|-------|
| Importar histórico do Sheets para Supabase | Alta | Sem isso o dashboard fica sem dados históricos |
| Aba de Produtos no admin (CRUD) | Alta | Permite adicionar produtos ausentes e ajustar preços |
| Inbox WhatsApp | Média | Depende de Z-API reconectada |
| Toggle PDV/Inbox no painel esquerdo | Média | UX planejada |
| Controle de atendimento por conversa | Média | Estado: aberto / em atendimento / resolvido |
| Venda de balcão com busca de contato | Baixa | Vincula venda a contato opcional |
| Import/export CSV no admin | Baixa | Backup manual |
