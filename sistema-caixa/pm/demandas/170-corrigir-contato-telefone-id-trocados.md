# 170 — Corrigir contato com telefone e ID trocados de lugar

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-15
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Durante o levantamento da demanda 168, foi encontrada 1 linha em `jsgrafica_contatos` com os
campos `phone` e `contact_lid` invertidos: `contact_lid: "558186108547"` (que é, na verdade, o
`connected_phone` da própria gráfica em `jsgrafica_agent_config` — o número conectado à Z-API) e
`phone: "250899775631523@lid"` (formato de LID, que deveria estar no campo `contact_lid`, não em
`phone`). Contaminação de dado pontual, achada de passagem — não investigada a fundo ainda.

## Objetivo
Entender como essa linha específica ficou com os campos trocados e corrigir (ou remover, se for
lixo/teste) sem afetar outros contatos.

## Escopo
- Incluído: localizar a linha exata (buscar por `contact_lid = '558186108547'`), entender se ela
  tem mensagens/histórico reais associados (`total_interacoes`, `total_mensagens_recebidas`) ou é
  vazia/lixo, e decidir com base nisso: corrigir os campos (`phone`↔`contact_lid` trocados de
  volta) se houver dado real associado, ou remover se for claramente uma linha órfã/de teste.
  Reportar antes de decidir entre corrigir e remover, se não for óbvio.
- Explicitamente fora de escopo: procurar sistematicamente por OUTRAS linhas com o mesmo padrão
  de troca (pode virar demanda separada se esta investigação sugerir que não é caso único).

## Critérios de aceite
- [ ] Linha localizada e contexto entendido (tem histórico real ou é lixo)
- [ ] Decisão tomada (corrigir campos ou remover) e executada
- [ ] Confirmado que a correção não duplicou nem quebrou vínculo com nenhum pedido/mensagem real

## Riscos e cuidados
Não presumir que é lixo sem checar — se tiver mensagens reais associadas, a correção dos campos
precisa preservar esse histórico.

## Referências
`jsgrafica_contatos`, `jsgrafica_agent_config.connected_phone`. Achado na mesma investigação da
demanda 168.

## Relato de execução

**Status: concluída.**

### Investigação

A linha (`contact_lid='558186108547'`, `phone='250899775631523@lid'`, `lead_name='J S Gráfica'`)
tinha `total_mensagens_recebidas = 0` — nunca teve nenhuma mensagem recebida associada de fato.
Cruzando `jsgrafica_log_msgs_privadas` por `phone`/`contact_lid`/`conversation_id`, achei uma
mistura de 2 coisas diferentes:

1. **A conversa real por trás dessa confusão já existe, correta, em outro contato**: telefone
   `558189349068` (`lead_name: "Emilly ❤️💕"`, 48 interações, `contact_lid` correto
   `250899775631523@lid`) — pedido de "foto tipo polaroide", negociação de preço, Pix, retirada.
   Essa é a cliente de verdade; o histórico dela está 100% preservado nesse contato correto.
2. **A linha problemática** parece ter nascido de eventos de callback com `message_text = null`
   (prováveis ecos de status/entrega, não mensagem de conteúdo) onde o campo `phone` recebeu um
   valor em formato LID (`250899775631523@lid`, o mesmo LID da Emilly, por coincidência/colisão de
   evento) e `contact_lid` recebeu o `connected_phone` da própria gráfica (`558186108547`) —
   nenhum dos dois valores representa um cliente real nessa linha especificamente.

**Não é um caso de "corrigir trocando de volta"**: inverter os campos dessa linha resultaria em
`phone='558186108547'` (o número da própria gráfica) e `contact_lid='250899775631523@lid'` — ainda
sem sentido como identidade de cliente (viraria "cliente" com o telefone da própria empresa). A
troca simples não produz um contato válido, porque nenhum dos 2 valores é, de fato, o telefone
real de um cliente.

### Decisão: removida (linha órfã, sem histórico próprio, sem vínculo)

- `total_mensagens_recebidas = 0` na própria linha (confirmado, nenhum conteúdo real exclusivo
  dela).
- O histórico de conversa real da Emilly já está correto e intacto no contato certo
  (`phone=558189349068`), então remover essa linha não perde absolutamente nada.
- `jsgrafica_pedidos.telefone` não tem nenhuma linha com `'250899775631523@lid'` nem com
  `'558186108547'` — zero vínculo de pedido pra preservar ou quebrar.

```sql
delete from jsgrafica_contatos
where contact_lid = '558186108547' and phone = '250899775631523@lid';
-- 1 linha removida
```

Confirmado depois: contato da Emilly (`558189349068`) intacto, 48 interações, `contact_lid` certo.

### Nota pra demanda 168
Essa mesma linha aparecia nos 32 contatos com `lead_name='J S Gráfica'` levantados pela 168 —
como foi removida aqui (não corrigida), não precisa de decisão de nome na 168.

### Achados fora do escopo
Não investiguei sistematicamente se existem OUTRAS linhas com o mesmo padrão (eventos de status
com `phone`/`contact_lid` sem sentido) — fora de escopo explícito desta demanda. Se o padrão for
comum, vale uma demanda separada de varredura (mesma sugestão que a própria 170 já previa).

### Critérios de aceite
- [x] Linha localizada e contexto entendido (sem histórico real próprio — o real já está em outro
      contato correto)
- [x] Decisão tomada (remover, não corrigir — trocar os campos não produziria uma identidade
      válida) e executada
- [x] Confirmado que a remoção não duplicou nem quebrou vínculo com nenhum pedido/mensagem real
      (zero pedidos vinculados; contato real da Emilly intacto)
