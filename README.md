# Simple Recipe App

Upload recipe PDFs, let OpenAI parse them, browse and search the results. Nothing more.

## Stack

- Next.js 14 (App Router) + React + TypeScript
- Tailwind CSS
- Turso (hosted libSQL / SQLite) via `@libsql/client`
- `pdf-parse` for PDF text extraction
- OpenAI Chat Completions (default model `gpt-4o-mini`) in JSON mode

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure env
cp .env.example .env.local
#   then edit .env.local and set:
#     OPENAI_API_KEY        — your OpenAI key
#     TURSO_DATABASE_URL    — libsql://<db>.turso.io
#     TURSO_AUTH_TOKEN      — Turso auth token

# 3. Run dev server
npm run dev
```

Open http://localhost:3000. The `recipes` table is created automatically on first request.

## Deploying to Vercel

1. Push the branch to GitHub.
2. On vercel.com → **Add New → Project** → import the repo.
3. In **Settings → Environment Variables**, add (for Production, Preview, Development):
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy. Framework preset auto-detects as Next.js.

Notes:
- The upload route uses `maxDuration = 60` (Vercel Hobby cap) since PDF parse + OpenAI can be slow.
- Upload is capped at 4 MB to fit Vercel's serverless body limit.

## Using it

On the home page you have two ways to add a recipe:

- **Upload PDF** — pick a recipe PDF. Server extracts text, OpenAI structures it.
- **Paste text** — paste the raw recipe text. Optionally attach up to 5 photos
  (compressed client-side). Photos appear on the recipe page and as the card
  thumbnail.

After saving you're redirected to the recipe page. Use the search bar on the
home page to filter by title, ingredient, or tag. Hit **Delete** on a recipe
page to remove it.

## File layout

```
app/
  page.tsx                       — recipe list + search + upload
  recipes/[id]/page.tsx          — recipe detail view (with photo gallery)
  api/recipes/route.ts           — GET (list, search)
  api/recipes/[id]/route.ts      — GET, DELETE
  api/recipes/upload/route.ts    — POST (PDF upload + OpenAI parse)
  api/recipes/text/route.ts      — POST (pasted text + images + OpenAI parse)
components/
  UploadCard.tsx                 — tabbed (PDF / paste text)
  PdfUploadForm.tsx
  PasteTextForm.tsx              — pastes text + attaches/compresses images
  SearchBar.tsx
  RecipeCard.tsx                 — shows first image as thumbnail
  DeleteButton.tsx
lib/
  db.ts        — SQLite init
  recipes.ts   — list/get/create/delete
  pdf.ts       — pdf-parse wrapper
  openai.ts    — OpenAI extraction prompt + JSON parse
  types.ts     — Recipe type
slices.md                        — original plan + slice breakdown
```

## Notes / limits

- PDFs must contain real text. Scanned-image PDFs won't extract (no OCR).
- Max upload size: 10 MB.
- No auth — single-user, local app.
- No editing yet — re-upload to fix mistakes.
