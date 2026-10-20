# MRTorneio

Motor de torneios (Grupo + Chaves e eliminatória) — app standalone Vite + React + TypeScript + Supabase.

Extraído do MVP LETZMR (Academy PR #1). Deploy e banco **separados** do MR Academy.

## Executar local

```sh
npm install
cp .env.example .env   # preencher com projeto Supabase NOVO
npm run dev
```

- **Demo local** — `localStorage` `letzmr:demo:v1` (não grava no Supabase)
- **Conta (Supabase)** — requer login + schema aplicado

```sh
npm test
npm run build
```

## Schema Supabase (projeto novo)

1. Criar projeto em [supabase.com](https://supabase.com) (dev)
2. SQL Editor → colar/executar `supabase/sql/letzmr_mvp_optional_schema.sql`
3. Auth → criar usuário(s) de teste (e-mail/senha)
4. Preencher `.env` com URL + anon key
5. Entrar em `/login?redirect=/`

## Deploy (Vercel)

1. Importar este repo `mrtorneio`
2. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Framework: Vite; output `dist`

## Rotas

| Rota | Uso |
| --- | --- |
| `/` | Home / torneios |
| `/t/:id` | Categorias |
| `/t/:id/c/:cid` | Operação |
| `/public/:tid/:cid` | Consulta pública RO |
| `/login` | Auth Supabase |

## Fora do escopo

Disputa por equipe, Rainha da Quadra, pagamentos, API LetzPlay, produção Academy.
