# Pesquisa 256 — quantitativo completo, população de clientes reais

**Nota sobre o número da população (documentado por decisão explícita do coordenador, não
escondido):**
- População no momento da aprovação da demanda (2026-07-30, manhã): **666**.
- População no momento da execução desta análise (2026-07-30, mais tarde): **668**.
- Diferença de **+2** por crescimento orgânico normal da base entre aprovação e execução —
  sistema é produção ao vivo (PDV rodando), sem timestamp fixo pra reproduzir o corte exato de
  666. Diagnóstico completo de que não é bug/duplicata/contaminação: ver seção final.
- Toda a análise abaixo foi rodada sobre os **668 clientes reais atuais**, filtro exato:

```sql
telefone IS NOT NULL AND telefone <> 'balcao' AND telefone NOT LIKE 'balcao-%'
AND telefone NOT IN ('5521965185667','558132176990','558181990533',
                      '11308716003574@lid','169501605793973@lid')
```

---

## 1. Confirmação da população

`COUNT(DISTINCT telefone)` em `jsgrafica_pedidos` com o filtro acima, sem restrição de data
(histórico completo): **668**.

---

## 2. Clientes com sessão de log recuperável vs. só pedido

Metodologia: match por últimos 11 dígitos do telefone (exceto `@lid`, que bate direto por
`contact_lid`/`phone`), contra `jsgrafica_log_msgs_privadas` filtrando `is_group=false`,
`apagada_em IS NULL`, `tipo_evento='RECEBIDA'`, `from_me` false/nulo (mensagem real recebida do
cliente, não enviada pela gráfica).

| Situação | Qtd clientes | % dos 668 |
|---|---:|---:|
| Com pelo menos 1 sessão real recuperável no log | 662 | 99,1% |
| Pedido sem NENHUMA mensagem de log correspondente | 6 | 0,9% |

Confirma achado já conhecido de outras investigações: a esmagadora maioria dos clientes reais
tem rastro recuperável no log. O grupo "sem log" é pequeno e residual (6 clientes) nesta
população específica.

---

## 3. Crosstab tipo de mídia inicial × categoria predominante (por CLIENTE, histórico completo)

Tipo de mídia inicial = tipo da 1ª mensagem recuperável do cliente no log (não só sessões de um
mês — histórico completo). Categoria predominante = categoria mais pedida por aquele cliente
(empate desfeito por pedido mais recente, depois ordem alfabética).

### 3a. Totais por tipo de mídia inicial (668 clientes)

| tipo_midia_inicial | qtd_clientes | % |
|---|---:|---:|
| document | 266 | 39,8% |
| image | 204 | 30,5% |
| texto | 185 | 27,7% |
| sem_log (sem match) | 6 | 0,9% |
| audio | 3 | 0,4% |
| sticker | 3 | 0,4% |
| outro | 1 | 0,1% |
| **Total** | **668** | 100% |

### 3b. Totais por categoria predominante (668 clientes)

| categoria_predominante | qtd_clientes |
|---|---:|
| Impressão papel oficio | 489 |
| Impressão papel foto | 33 |
| Consulta Online | 30 |
| xerox | 25 |
| Escritório | 20 |
| Impressão papel cartao | 14 |
| Impressão papel adesivo | 10 |
| Sem categoria (servico_id nulo, sem match por nome) | 10 |
| Recarga vem | 8 |
| Personalizados | 7 |
| Plastificação | 7 |
| Encadernacao | 4 |
| Recarga celular | 4 |
| Serviço terceirizado | 4 |
| Impressão papel couche | 2 |
| Empréstimo | 1 |
| **Total** | **668** |

### 3c. Crosstab completo (mídia inicial × categoria predominante → nº de clientes)

Só combinações com pelo menos 1 cliente (soma total = 668):

| tipo_midia_inicial | categoria_predominante | qtd_clientes |
|---|---|---:|
| document | Impressão papel oficio | 230 |
| image | Impressão papel oficio | 133 |
| texto | Impressão papel oficio | 120 |
| image | Impressão papel foto | 18 |
| texto | Consulta Online | 17 |
| document | Escritório | 11 |
| image | Impressão papel cartao | 11 |
| texto | Impressão papel foto | 10 |
| document | xerox | 9 |
| image | Consulta Online | 9 |
| image | xerox | 7 |
| texto | xerox | 7 |
| image | Impressão papel adesivo | 6 |
| document | Impressão papel foto | 5 |
| texto | Escritório | 5 |
| texto | Sem categoria | 5 |
| image | Escritório | 4 |
| texto | Personalizados | 4 |
| texto | Plastificação | 4 |
| document | Recarga vem | 3 |
| image | Personalizados | 3 |
| image | Sem categoria | 3 |
| sem_log | Impressão papel oficio | 3 |
| texto | Impressão papel adesivo | 3 |
| texto | Recarga vem | 3 |
| document | Consulta Online | 2 |
| document | Sem categoria | 2 |
| image | Encadernacao | 2 |
| image | Impressão papel couche | 2 |
| image | Plastificação | 2 |
| image | Recarga vem | 2 |
| sem_log | xerox | 2 |
| sticker | Impressão papel oficio | 2 |
| texto | Encadernacao | 2 |
| texto | Impressão papel cartao | 2 |
| texto | Serviço terceirizado | 2 |
| audio | Consulta Online | 1 |
| audio | Impressão papel adesivo | 1 |
| audio | Recarga celular | 1 |
| document | Impressão papel cartao | 1 |
| document | Plastificação | 1 |
| document | Recarga celular | 1 |
| document | Serviço terceirizado | 1 |
| image | Recarga celular | 1 |
| image | Serviço terceirizado | 1 |
| outro | Impressão papel oficio | 1 |
| sem_log | Recarga celular | 1 |
| sticker | Consulta Online | 1 |
| texto | Empréstimo | 1 |

Leitura principal: documento → oficio (230 clientes) é de longe a combinação dominante, seguida
de imagem → oficio (133) e texto → oficio (120). Juntas essas 3 combinações somam 483 dos 668
clientes (72,3%) — a categoria "Impressão papel oficio" domina o comportamento inicial
independente do tipo de mídia.

---

## 4. Novo vs. recorrente (668 clientes, histórico completo, sem amostra)

| Tipo | Qtd clientes | % dos 668 | Total de pedidos gerados |
|---|---:|---:|---:|
| Novo (1 pedido em todo o histórico) | 394 | 59,0% | 394 |
| Recorrente (2+ pedidos) | 274 | 41,0% | 787 |
| **Total** | **668** | 100% | **1.181** |

Os 41% recorrentes respondem por 787 dos 1.181 pedidos totais (66,6% do volume de pedidos),
apesar de serem minoria em número de clientes — concentração de volume esperada em base de
clientes recorrentes.

---

## Diagnóstico do 666 → 668 (pra registro, feito antes da decisão do coordenador)

- Contagem robusta a variação de formatação: `COUNT(DISTINCT telefone)`, `COUNT(DISTINCT
  TRIM(telefone))` e `COUNT(DISTINCT LOWER(TRIM(telefone)))` dão os 3 exatamente 668. Zero linhas
  com espaço sobrando.
- Não é corte de dia cheio: testando `created_at < 'dia'` em vários pontos (fuso Recife), a
  contagem acumulada nunca bate 666 exatamente (646 antes de hoje, 626 antes de ontem, 602 antes
  de anteontem) — confirma que o 666 foi capturado num instante intra-dia específico (momento da
  aprovação da demanda), não uma contagem de fim de dia.
- Sem sinal de novo número de teste/contaminação fora da lista de exclusão de 5 já fornecida.
- **Decisão do coordenador:** seguir com a população real atual (668), sem perseguir reprodução
  exata do 666 — tratado como crescimento orgânico esperado em sistema de produção ao vivo.
