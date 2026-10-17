# Card Grading Simple

Card scan, portfolio, and Deep Core vault. Identity stays in Postgres. Live prices use the xAI key.

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database** and copy the **direct** connection string (`db.<ref>.supabase.co`, port **5432**) or the **session** pooler. Do not use the transaction pooler on port 6543.
3. Copy `.env.example` to `.env` and paste that string as `DATABASE_URL`.
4. Set `BETTER_AUTH_SECRET` to a long random string, `BETTER_AUTH_URL` to the app origin, and `XAI_API_KEY` for live prices.
5. `npm install` then `npm run db:migrate`.

That applies `migrations/` (accounts, card catalog, grade chat). The preview still uses embedded Postgres when `DATABASE_URL` is empty. A Supabase URL turns TLS on by itself.

## GitHub

```
npm install
npm run dev
```

The dev server is [http://127.0.0.1:8080](http://127.0.0.1:8080). Do not commit `.env`.
