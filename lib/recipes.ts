import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import { getDb } from "./db";
import { embeddingTextForRecipe, getEmbedding } from "./embeddings";
import type { Recipe, RecipeInput } from "./types";

const SELECT_COLUMNS = `id, title, description, servings, prep_time, cook_time,
  ingredients, instructions, tags, images, source_pdf, created_at`;

const SEMANTIC_LIMIT = 10;

function asString(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rowToRecipe(row: Row): Recipe {
  return {
    id: asString(row.id),
    title: asString(row.title),
    description: asString(row.description),
    servings: asString(row.servings),
    prepTime: asString(row.prep_time),
    cookTime: asString(row.cook_time),
    ingredients: safeParseArray(asString(row.ingredients) || "[]"),
    instructions: safeParseArray(asString(row.instructions) || "[]"),
    tags: safeParseArray(asString(row.tags) || "[]"),
    images: safeParseArray(asString(row.images) || "[]"),
    sourcePdf: asString(row.source_pdf),
    createdAt: asNumber(row.created_at),
  };
}

export async function listRecipes(query?: string): Promise<Recipe[]> {
  const db = await getDb();
  const q = query?.trim() ?? "";

  if (!q) {
    const result = await db.execute(
      `SELECT ${SELECT_COLUMNS} FROM recipes ORDER BY created_at DESC`
    );
    return result.rows.map(rowToRecipe);
  }

  // Text (LIKE) search: fast, exact-ish matches.
  const like = `%${q.toLowerCase()}%`;
  const textResult = await db.execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM recipes
          WHERE LOWER(title) LIKE ?
             OR LOWER(ingredients) LIKE ?
             OR LOWER(tags) LIKE ?
          ORDER BY created_at DESC`,
    args: [like, like, like],
  });

  // Semantic search: best-effort. If the embedding call or vector query
  // fails, just return the LIKE results.
  let semanticRows: Row[] = [];
  try {
    const queryEmbedding = await getEmbedding(q);
    const semanticResult = await db.execute({
      sql: `SELECT ${SELECT_COLUMNS}
            FROM recipes
            WHERE embedding IS NOT NULL
            ORDER BY vector_distance_cos(embedding, vector32(?)) ASC
            LIMIT ?`,
      args: [JSON.stringify(queryEmbedding), SEMANTIC_LIMIT],
    });
    semanticRows = semanticResult.rows;
  } catch (err) {
    console.error("[recipes] Semantic search failed, using text only:", err);
  }

  const seen = new Set<string>();
  const merged: Recipe[] = [];
  for (const row of [...textResult.rows, ...semanticRows]) {
    const recipe = rowToRecipe(row);
    if (seen.has(recipe.id)) continue;
    seen.add(recipe.id);
    merged.push(recipe);
  }
  return merged;
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM recipes WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToRecipe(row) : null;
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const db = await getDb();
  const id = randomUUID();
  const createdAt = Date.now();

  // Best-effort embedding — if OpenAI is down or quota is exhausted,
  // still save the recipe (it just won't show up in semantic search
  // until re-embedded).
  let embeddingJson: string | null = null;
  try {
    const text = embeddingTextForRecipe(input);
    if (text.trim()) {
      const vector = await getEmbedding(text);
      embeddingJson = JSON.stringify(vector);
    }
  } catch (err) {
    console.error("[recipes] Embedding generation failed; saving without:", err);
  }

  const baseColumns = [
    "id",
    "title",
    "description",
    "servings",
    "prep_time",
    "cook_time",
    "ingredients",
    "instructions",
    "tags",
    "images",
    "source_pdf",
    "created_at",
  ];
  const baseArgs = [
    id,
    input.title,
    input.description,
    input.servings,
    input.prepTime,
    input.cookTime,
    JSON.stringify(input.ingredients),
    JSON.stringify(input.instructions),
    JSON.stringify(input.tags),
    JSON.stringify(input.images),
    input.sourcePdf,
    createdAt,
  ];

  if (embeddingJson !== null) {
    await db.execute({
      sql: `INSERT INTO recipes (${baseColumns.join(", ")}, embedding)
            VALUES (${baseColumns.map(() => "?").join(", ")}, vector32(?))`,
      args: [...baseArgs, embeddingJson],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO recipes (${baseColumns.join(", ")})
            VALUES (${baseColumns.map(() => "?").join(", ")})`,
      args: baseArgs,
    });
  }

  return { id, createdAt, ...input };
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({
    sql: `DELETE FROM recipes WHERE id = ?`,
    args: [id],
  });
  return result.rowsAffected > 0;
}
