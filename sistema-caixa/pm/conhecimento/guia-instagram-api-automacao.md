# Automatizando publicação no Instagram via API

### Guia de referência: como configurar publicação automática (feed, carrossel, Reels e Stories) usando a API oficial da Meta e n8n

Copiado e adaptado de `kuidu/tutoriais/instagram-api-automacao.md` em 2026-08-19, a pedido do
Edvam, pra ficar disponível direto no projeto da JS Gráfica quando a conta comercial do
Instagram estiver pronta pra conectar (ver `pm/equipe/07-marketing.md` e a demanda 310/311).
Processo já testado numa conta real (Kuidu, mesmo grupo, mesma infraestrutura LabOnchain
compartilhada). Onde aparecer nome de exemplo (`postjsgrafica-IG` etc.), é só ilustrativo,
substitua pelos dados reais da conta da gráfica. **Nenhuma chave, token ou senha real aparece
neste documento**, todo lugar que pediria um segredo está marcado como `<SEU_VALOR_AQUI>`.

## O que você vai ter no final

Uma conta do Instagram publicando sozinha, feed (imagem única ou carrossel), Reels e Stories,
a partir de uma fila de conteúdo aprovado, sem precisar abrir o app do Instagram pra postar.
Também um monitor que avisa quando o acesso expira, e uma coleta diária de métricas.

## O que a API não faz (leia antes de prometer isso pra alguém)

- **Não apaga posts.** O endpoint de exclusão existe, mas exige um tipo de login diferente do
  usado pra publicar (ver Parte 5). Na prática, é bem mais trabalho do que parece à primeira
  vista.
- **Não cria Destaques.** Não existe endpoint oficial pra isso.
- **Não seleciona vários posts pra arquivar em lote.** Isso só existe dentro do próprio app do
  Instagram, sem tela múltipla nativa hoje.

Se o objetivo inclui qualquer um desses três, planeje isso separado, não é a mesma automação.

---

## Parte 1, Pré-requisitos

1. **Conta do Instagram tipo Business ou Creator** (não pessoal). Se ainda for pessoal,
   converta em Configurações → Conta → Mudar para conta profissional.
2. **A conta precisa estar vinculada a uma Página do Facebook.** É um requisito técnico da
   API, não uma escolha, sem isso, nada funciona.

   **Como conferir se já está vinculada:**
   - Via Meta Business Suite: `business.facebook.com/settings/instagram-accounts`, clique na
     conta, aba **"Ativos conectados"**, deve aparecer 1 Página listada.
   - Se não aparecer nenhuma, vincule antes de continuar (Configurações da Página do Facebook
     → Instagram → Conectar conta).

3. **Uma conta no Meta for Developers** (`developers.facebook.com`), com login de
   administrador da Página acima.

---

## Parte 2, Criando o app no Meta for Developers

### 2.1, Criar o app

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps/) e clique em
   **Criar app**.
2. Escolha um nome que identifique a conta (ex.: `postjsgrafica-IG`, padrão
   `post<nome-da-marca>-IG`).
3. Na tela de **Casos de uso**, marque **apenas**: "Gerenciar mensagens e conteúdo no
   Instagram".

   > **Armadilha:** não marque outros casos de uso "de bônus" nessa tela achando que vai
   > economizar trabalho depois. A Meta às vezes trava a combinação de alguns casos de uso no
   > mesmo app (mensagem: "Alguns casos de uso não podem ser combinados no mesmo app") e força
   > criar um app separado mais tarde. Comece mínimo, adicione depois se precisar.

4. Confirme e crie o app.

### 2.2, Adicionar as permissões certas

Dentro do app: **Casos de uso → Personalizar** o caso de uso do Instagram → aba **"Permissões
e recursos"**.

A lista é longa e alfabética, use Ctrl+F pra achar cada uma e clicar **"+ Adicionar"**:

| Permissão | Pra que serve |
|---|---|
| `instagram_business_basic` | Ler dados básicos do perfil (obrigatória) |
| `instagram_business_content_publish` | A que de fato libera postar. Sem ela, nada publica |
| `instagram_business_manage_comments` | Vem junto por exigência do caso de uso, mesmo sem usar ainda |
| `instagram_business_manage_messages` | Idem, fica disponível, não precisa usar |

### 2.3, Registrar a conta como testadora

Menu lateral → **Funções do app → Funções → Adicionar pessoas** → escolha **"Testador do
Instagram"** (não confundir com "Testador" genérico, que é outra coisa) → confirme o convite
pela própria conta do Instagram (Configurações → Apps e sites → Convites do testador).

### 2.4, Gerar o token de acesso

Volta em **Casos de uso → Personalizar** o caso de uso do Instagram → **"2. Gerar tokens de
acesso"** → **"Adicionar conta"** → autorize no pop-up que abre → copie o token gerado.

> **Armadilha real, que já custou tempo no Kuidu:** esse token já está pronto pra uso direto.
> Não existe (nem é preciso) nenhuma etapa de "trocar por token de longa duração" quando ele é
> gerado por aqui, isso é coisa do fluxo de login padrão (OAuth de usuário final), não desse.
> Se você tentar trocar mesmo assim, a API responde com um erro de sessão inválida, não é bug,
> é sinal de que o passo não se aplica. Teste o token direto com uma chamada simples primeiro
> (`GET /me`) antes de desconfiar dele.

```
GET https://graph.instagram.com/v23.0/me?fields=id,username
Authorization: Bearer <SEU_TOKEN_AQUI>
```

Resposta esperada: `{"id":"...","username":"..."}`. Se vier isso, o token funciona.

### 2.5, Sobre revisão do Meta (App Review)

**Publicar na própria conta não exige revisão formal do Meta.** O que a Meta chama de
"Standard Access" já é suficiente pra postar, ler métricas e monitorar o token, desde que seja
a sua própria conta (adicionada como testadora, como no passo 2.3), não a de um
cliente/terceiro. App Review só entra em cena se o app for atender contas de outras empresas.

---

## Parte 3, Entendendo a API antes de automatizar

Publicar pela API sempre segue os mesmos 3 passos, pra qualquer formato:

```
1. Criar um "container" com a mídia          -> POST /me/media
2. Esperar processar e checar o status        -> GET /{container-id}?fields=status_code
3. Publicar o container já pronto             -> POST /me/media_publish
```

### Requisitos por formato

| Formato | O que enviar | Regras importantes |
|---|---|---|
| **Feed (1 imagem)** | `image_url` | Só **JPEG**, a API rejeita PNG. Proporção entre 4:5 e 1.91:1. |
| **Carrossel (2 a 10 imagens)** | Criar 1 container por imagem (`is_carousel_item: true`), depois 1 container "pai" do tipo `CAROUSEL` referenciando os filhos | Não dá pra apagar 1 item do carrossel sem apagar o álbum inteiro depois. |
| **Reels** | `media_type: REELS` + `video_url` | 9:16, 5 a 90s pra aparecer na aba Reels, H.264/HEVC, áudio AAC. Processa mais devagar que imagem, o passo 2 pode levar minutos, não segundos. |
| **Stories** | `media_type: STORIES` + `image_url` ou `video_url` | Some sozinho em 24h (comportamento do próprio Instagram, não é bug de nada). |

A URL da mídia (`image_url`/`video_url`) precisa ser pública, a Meta busca o arquivo direto de
lá. Hospedar num bucket de armazenamento com URL pública (Supabase Storage, S3, etc.) resolve
isso, o mesmo bucket `inbox-media` já usado no upload do modal de Conteúdo serve.

---

## Parte 4, Automatizando com n8n

### 4.1, Por que ter uma fila (banco de dados) em vez de automação direta

Separar "o que vai ser postado" (uma tabela num banco de dados) de "o mecanismo que posta" (o
workflow) permite: um painel de aprovação humana antes de qualquer coisa ir ao ar, histórico do
que já foi publicado, e reagendar sem mexer no workflow. Mesmo raciocínio já usado pra fila do
WhatsApp Status (`labon_status_queue`).

**Estrutura mínima da tabela de fila** (padrão real usado no Kuidu, `kuidu_content_queue`):

| Coluna | Uso |
|---|---|
| `status` | `pending` → `approved` → `publishing` → `published` / `error` |
| `tipo` | `feed` / `reels` / `stories` |
| `caption`, `image_urls[]`, `video_url` | O conteúdo em si |
| `scheduled_at` | O workflow só publica quando essa data já passou e o status é `approved` |
| `instagram_url`, `published_at` | Preenchidos pelo workflow depois de publicar |
| `comments` | Onde o workflow grava o motivo, se der erro |

> **Decisão importante:** um post aprovado sem `scheduled_at` definido nunca deve ser publicado
> sozinho. Fica aprovado, esperando alguém escolher a data, não assume "agora" como padrão (a
> primeira versão construída no Kuidu assumia "agora" por padrão, e isso publicava posts sem
> ninguém ter escolhido quando, corrigido depois).

### 4.2, O workflow principal (publicação)

```
Agendamento (a cada 15 min)
  -> Buscar 1 post com status='approved' e scheduled_at <= agora
  -> Travar (status='publishing', pra 2 execucoes nao pegarem o mesmo post)
  -> Montar o payload certo pro tipo (feed/carrossel/reels/stories)
  -> Criar o(s) container(s)
  -> Esperar + checar status, com limite de tentativas (ex.: 30x, ~10 min).
     Sem limite, um video travado deixa a execucao rodando pra sempre
  -> Publicar
  -> Buscar o link do post publicado
  -> Marcar como published na fila
```

Erro em qualquer etapa: marca `status='error'` com o motivo em `comments`, não deixa a linha
"sumida".

### 4.3, Workflows auxiliares (recomendado, não obrigatório)

- **Monitor do token**: 1x/dia, faz um `GET /me` simples. Se falhar (erro 401/código 190,
  token expirado), registra um alerta. Tokens desse tipo costumam durar uns 60 dias.
- **Insights diários**: 1x/dia, coleta métricas (alcance, curtidas, salvamentos) da conta e dos
  posts recentes, guarda num histórico. Não é obrigatório pra publicação funcionar, mas é a
  única forma de ter esse dado com histórico (o Instagram não guarda isso acessível depois de
  um tempo).

---

## Parte 5, O que já foi testado e não funciona (documentado pra não repetir)

### Excluir posts pela API

O endpoint existe (`DELETE /<id-da-midia>`), mas segundo a documentação oficial, só funciona
com um tipo de login diferente do que usamos pra publicar: "Instagram com login do Facebook"
(Facebook User Access Token via `graph.facebook.com`), não o "Instagram Login" que a Parte 2
deste guia configura.

A tentativa de configurar esse segundo fluxo à parte (app extra tipo "Empresa", produto "Login
do Facebook para Empresas") esbarrou em: a tela de "Configurações de Login para Empresas" (onde
se escolhe permissão de Página/Instagram) não ficou disponível pro tipo de app testado, nem
pelo painel do app nem pelo Graph API Explorer, mesmo com um app criado do zero, só com esse
único caso de uso, pra descartar erro de configuração.

**Conclusão prática:** se o objetivo incluir apagar posts em massa pela API, planeje isso como
um projeto à parte, provavelmente exigindo revisão mais profunda da documentação da Meta ou
ajuda de alguém com experiência específica nesse fluxo, não é uma extensão simples do que está
neste guia. Mesma limitação já confirmada pra JS Gráfica no caso do WhatsApp Status (ver
demanda 310).

### Destaques (Highlights)

Não existe endpoint oficial pra isso na Graph API. Só é possível via APIs não oficiais
(engenharia reversa do app), que violam os termos de uso do Instagram, não recomendado.

---

## Parte 6, Armadilhas comuns (resumo rápido)

| Sintoma | Causa provável |
|---|---|
| Token "não funciona" logo depois de gerado | Provavelmente funciona, teste com `GET /me` antes de tentar "trocar" ele |
| Erro de permissão ao chamar `DELETE` | Endpoint exige o fluxo de login do Facebook, não o de Instagram (ver Parte 5) |
| Imagem rejeitada | Confirmar que é JPEG, PNG não é aceito pela API |
| Execução do workflow trava num vídeo | Faltou limite de tentativas no loop de checagem de status |
| Upload de arquivo falha com erro 413 (grande demais) | Se a automação/painel roda em função serverless (Vercel, etc.), pode existir limite de tamanho de corpo de requisição (na Vercel, ~4,5MB), a correção é o arquivo ir direto pro armazenamento (URL assinada), não passar pela função |

---

## Apêndice, Onde ficam as chaves (checklist, sem valores)

Depois de seguir este guia, deve estar guardado num cofre de senhas ou variável de ambiente
segura (nunca em texto puro num repositório):

- [ ] Token de acesso do Instagram (Parte 2.4)
- [ ] ID do app e chave secreta do app (tela "Configurações → Básico" do app no Meta for
      Developers)
- [ ] Credencial/chave do serviço de automação usado (n8n)
- [ ] Se for usar banco de dados pra fila: string de conexão / chave de serviço do banco

Nunca exponha a chave de serviço do banco de dados nem a chave secreta do app em código que
roda no navegador, só em código de servidor.
