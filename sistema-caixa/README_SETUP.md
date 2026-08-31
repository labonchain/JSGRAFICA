# Setup — Caixa JS Gráfica

## O que você vai precisar
- Conta Google (lab.onchain@gmail.com já tem acesso à planilha)
- Conta no [Vercel](https://vercel.com) (gratuita)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com)

---

## PASSO 1 — Criar Service Account no Google Cloud

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto (ex: `caixa-js-grafica`)
3. No menu lateral: **APIs e Serviços → Biblioteca**
4. Busque e ative: **Google Sheets API**
5. Vá em **APIs e Serviços → Credenciais**
6. Clique em **Criar credenciais → Conta de serviço**
   - Nome: `caixa-js-grafica`
   - Clique em **Concluído**
7. Clique na conta de serviço criada
8. Aba **Chaves → Adicionar chave → Criar nova chave → JSON**
9. Baixe o arquivo JSON gerado

---

## PASSO 2 — Compartilhar a planilha com a Service Account

1. Abra o arquivo JSON baixado
2. Copie o valor de `client_email` (ex: `caixa-js-grafica@seu-projeto.iam.gserviceaccount.com`)
3. Abra a planilha CAIXA ATUAL no Google Sheets
4. Clique em **Compartilhar**
5. Cole o e-mail da service account com permissão de **Editor**
6. Clique em **Enviar**

---

## PASSO 3 — Configurar variáveis no Vercel

1. Acesse https://vercel.com e faça login
2. Importe este projeto do GitHub (ou faça upload da pasta)
3. Em **Project Settings → Environment Variables**, adicione:

   **`GOOGLE_SHEETS_ID`**
   ```
   1KZty9lghh8eehectdnd2xxIlvBznqV-6
   ```

   **`GOOGLE_SERVICE_ACCOUNT_JSON`**
   Cole o conteúdo inteiro do arquivo JSON da service account (em uma linha só)

4. Clique em **Deploy**

---

## PASSO 4 — Testar localmente (opcional)

```bash
cd caixa-js-grafica
npm install
cp .env.local.example .env.local
# Edite .env.local com os valores reais
npm run dev
```

Acesse: http://localhost:3000

---

## Como usar no celular (PWA)

1. Abra a URL do Vercel no Chrome (Android) ou Safari (iPhone)
2. Toque no menu do navegador → **"Adicionar à tela inicial"**
3. O app aparecerá como um ícone, igual um app nativo

---

## Estrutura do projeto

```
caixa-js-grafica/
├── app/
│   ├── page.tsx              ← Interface principal (4 telas)
│   ├── layout.tsx            ← Layout + PWA config
│   ├── globals.css
│   └── api/
│       ├── vendas/route.ts   ← POST: lança venda | GET: lista vendas do dia
│       ├── saidas/route.ts   ← POST: lança saída | GET: lista saídas do dia
│       ├── fechamento/route.ts ← GET: dados fechamento | POST: fecha caixa
│       └── dashboard/route.ts  ← GET: histórico 30 dias
├── lib/
│   └── sheets.ts             ← Integração Google Sheets + lista de produtos/categorias
├── public/
│   └── manifest.json         ← PWA manifest
├── .env.local.example        ← Template de variáveis
└── README_SETUP.md           ← Este arquivo
```

---

## Atualizar tabela de preços

Edite o array `PRODUTOS` em `lib/sheets.ts` e faça novo deploy no Vercel.  
Os preços ficam centralizados — um único lugar para atualizar tudo.

---

## Suporte

Projeto criado por Claude para JS Gráfica.  
Em caso de dúvidas: lab.onchain@gmail.com
