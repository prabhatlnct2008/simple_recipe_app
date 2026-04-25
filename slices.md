# Simple Recipe App — Plan & Slices

A straightforward recipe website. Upload a PDF, OpenAI extracts the recipe, you can browse, view, and search recipes. Nothing fancy.

## Stack

- **Framework**: Next.js 14 (App Router) — gives us frontend + backend in one project (covers "nextjs, node, react").
- **Styling**: Tailwind CSS.
- **Storage**: SQLite via `better-sqlite3` — single file, zero setup, fits "not complex".
- **PDF parsing**: `pdf-parse` to pull raw text from the uploaded PDF.
- **AI**: OpenAI Chat Completions API (`gpt-4o-mini`) with JSON-mode to turn raw text into structured recipe.
- **Uploads**: Next.js Route Handler reading `FormData` (no extra middleware needed).

## Data model

A recipe row:

```
id            TEXT PRIMARY KEY      // uuid
title         TEXT
description   TEXT
servings      TEXT
prep_time     TEXT
cook_time     TEXT
ingredients   TEXT  (JSON array of strings)
instructions  TEXT  (JSON array of strings)
tags          TEXT  (JSON array of strings)
source_pdf    TEXT  (original filename)
created_at    INTEGER
```

Search is a `LIKE` over title + ingredients + tags. Plenty for a personal app.

## Frontend pages

- `/`               — list + search bar + "Upload PDF" button.
- `/recipes/[id]`   — full recipe view.
- (no separate upload page — upload is a modal/inline form on `/`).

## Backend routes

- `POST /api/recipes/upload`  — accepts a PDF file, extracts text, calls OpenAI, stores recipe, returns it.
- `GET  /api/recipes`         — list recipes; optional `?q=` for search.
- `GET  /api/recipes/[id]`    — single recipe.
- `DELETE /api/recipes/[id]`  — remove a recipe.

## Slices (each is shippable on its own)

### Slice 1 — Scaffold
- `package.json`, Next.js 14, TypeScript, Tailwind.
- `app/layout.tsx`, `app/page.tsx` placeholder, base styling, `.env.example` for `OPENAI_API_KEY`.
- `.gitignore`.

### Slice 2 — Data layer
- `lib/db.ts` — initializes SQLite at `data/recipes.db`, creates table on first run.
- `lib/recipes.ts` — `listRecipes(q?)`, `getRecipe(id)`, `createRecipe(...)`, `deleteRecipe(id)`.
- Types in `lib/types.ts`.

### Slice 3 — Upload UI + endpoint (no AI yet)
- `POST /api/recipes/upload` — accepts file, currently just stores filename + raw text as a stub recipe so the round-trip works.
- Upload component on home page with file input, progress, error display.

### Slice 4 — OpenAI parsing
- `lib/openai.ts` — `extractRecipeFromText(rawText)` returns structured recipe via JSON mode.
- Wire it into the upload route, replacing the stub.
- Graceful error if `OPENAI_API_KEY` missing.

### Slice 5 — Recipe list view
- Home page fetches `/api/recipes`, shows cards (title, description, tags).
- Empty state: "Upload your first recipe."

### Slice 6 — Recipe detail view
- `/recipes/[id]` — title, description, meta (servings/times), ingredients list, numbered instructions, tags, source PDF name, delete button.

### Slice 7 — Search
- Search input on home page calls `/api/recipes?q=...` (debounced).
- Server-side `LIKE` filter over title/ingredients/tags.

### Slice 8 — Polish
- Delete confirmation.
- Loading spinners and error toasts.
- Friendly empty / error states.
- README with run instructions.

## Out of scope (explicitly)

- Auth / multi-user.
- Image uploads or rich media.
- Editing recipes after extraction (you can re-upload).
- Tagging UI / categories filter beyond search.
- Deployment config.
