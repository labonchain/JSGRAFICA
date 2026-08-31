# Caixa JS Gráfica

Sistema interno de caixa e PDV da JS Gráfica (Ibura, Recife — PE).

Usado pela equipe para registrar vendas, saídas e fechar o caixa do dia. Roda no navegador e funciona como PWA no celular.

---

## O que faz

- **PDV** — seleciona produto + quantidade, adiciona ao carrinho, fecha venda
- **Saídas** — registra despesas por categoria (fornecedores, folha, aluguel, etc.)
- **Fechamento** — consolida o dia e lança na planilha
- **Dashboard** — histórico dos últimos 30 dias
- **Movimento** — log de todas as transações do dia
- **Login** — seleção de usuário (admin ou atendente) sem senha

Todos os dados vão para uma planilha Google Sheets (`CAIXA ATUAL`).

---

## Stack
-
| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 4 |
| Dados | Google Sheets API (via Service Account) |
| Deploy | Vercel |

---

## Estrutura

```
caixa-js-grafica/
├── app/
│   ├── page.tsx              ← tela principal (login + tabs)
│   ├── pdv/page.tsx          ← tela do PDV
│   └── api/
│       ├── vendas/route.ts   ← POST: registra venda | GET: lista do dia
│       ├── saidas/route.ts   ← POST: registra saída | GET: lista do dia
│       ├── fechamento/route.ts  ← GET: dados | POST: fecha caixa
│       ├── dashboard/route.ts   ← GET: histórico 30 dias
│       ├── movimento/route.ts   ← GET: log do dia
│       └── log/route.ts         ← log de auditoria
├── lib/
│   ├── dados.ts              ← lista de produtos e categorias de saída
│   ├── sheets.ts             ← integração com Google Sheets
│   └── usuarios.ts           ← usuários do sistema (hardcoded)
├── public/
│   └── manifest.json         ← configuração PWA
└── middleware.ts             ← proteção de rotas
```

---

## Variáveis de Ambiente

```env
GOOGLE_SHEETS_ID=1KZty9lghh8eehectdnd2xxIlvBznqV-6
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Copie `.env.local.example` para `.env.local` e preencha os valores.

---

## URLs de Produção

| Ambiente | URL |
|---|---|
| PDV (atendimento) | https://pdv.jsgrafica.site/ |
| Admin | https://admin.jsgrafica.site/ |

---

## Rodar Localmente

```bash
npm install
cp .env.local.example .env.local
# edite .env.local com as credenciais reais
npm run dev
```

Acesse: http://localhost:3000

---

## Deploy

O projeto está no Vercel com domínio customizado `jsgrafica.site`. Qualquer push na branch principal faz deploy automático.

Para configurar do zero, veja [README_SETUP.md](README_SETUP.md).

---

## Atualizar Produtos ou Preços

Edite o array `PRODUTOS` em [`lib/dados.ts`](lib/dados.ts).  
Os nomes devem coincidir exatamente com as colunas da planilha Google Sheets.
