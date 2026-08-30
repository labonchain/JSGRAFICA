# Canal do WhatsApp - JS Gráfica

Repositório operacional do Canal da JS Gráfica. Aqui ficam a base de marca, os briefings, as copies e as artes de cada postagem. Ele é a referência compartilhada para direção de conteúdo e design.

**Entrada obrigatória:** todo chat deve começar por [`docs/LEIA_PRIMEIRO.md`](docs/LEIA_PRIMEIRO.md).

## Regra principal

O trabalho acontece em **blocos de 3 conteúdos**. Um novo bloco só começa quando o estado dos três conteúdos anteriores estiver registrado, mesmo que algum tenha sido bloqueado ou cancelado.

## Estrutura

```text
docs/
  marca/       Manual, fontes e regras da identidade
  direcao/     Direção editorial e visual permanente
  operacao/    Regras e convenções
assets/marca/  Logos oficiais para uso nas peças
conteudos/AAAA/MM/BLOCO-NNN_ID-ID-ID/
  briefings/   Briefing aprovado para criação
  copy/        Copy separada da arte
  artes/       PNG/JPG/PDF/arquivo fonte da peça
```

## Bloco 001

Os primeiros conteúdos são:

1. `P1-01` - Abertura do Canal
2. `P1-02` - Como falar com a JS Gráfica
3. `P2-01` - Impressão e xerox

Eles estão em `EM_BRIEFING`.

## Como um chat de design deve salvar a produção

1. Ler o briefing de `briefings/`, o manual em `docs/marca/` e a direção em `docs/direcao/`.
2. Salvar a copy como `CANAL_[ID]_[AAAAMMDD]_COPY_v01.md` em `copy/`.
3. Salvar a arte com o mesmo ID em `artes/`, por exemplo `CANAL_P1-01_20260830_ARTE_v01.png`.
4. Não substituir uma versão já criada: salvar `v02`, `v03` e assim por diante.

## Proteções obrigatórias

- Não inventar preço, prazo, promoção, disponibilidade ou regra de órgão.
- Não publicar dados pessoais, documentos, telas ou fotos de clientes sem autorização.
- Não redesenhar os logos nem criar cores ou fontes fora do manual.

## Convenção de nome

`CANAL_[ID]_[AAAAMMDD]_[TIPO]_vNN.ext`

Tipos aceitos neste repositório: `BRIEFING`, `COPY` e `ARTE`.
