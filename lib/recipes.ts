import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { Recipe, RecipeInput } from "./types";

type Row = {
  id: string;
  title: string;
  description: string;
  servings: string;
  prep_time: string;
  cook_time: string;
  ingredients: string;
  instructions: string;
  tags: string;
  source_pdf: string;
  created_at: number;
};

function rowToRecipe(row: Row): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    servings: row.servings,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    ingredients: safeParseArray(row.ingredients),
    instructions: safeParseArray(row.instructions),
    tags: safeParseArray(row.tags),
    sourcePdf: row.source_pdf,
    createdAt: row.created_at,
  };
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function listRecipes(query?: string): Recipe[] {
  const db = getDb();
  if (query && query.trim().length > 0) {
    const like = `%${query.trim().toLowerCase()}%`;
    const rows = db
      .prepare(
        `SELECT * FROM recipes
         WHERE LOWER(title) LIKE ?
            OR LOWER(ingredients) LIKE ?
            OR LOWER(tags) LIKE ?
         ORDER BY created_at DESC`
      )
      .all(like, like, like) as Row[];
    return rows.map(rowToRecipe);
  }
  const rows = db
    .prepare(`SELECT * FROM recipes ORDER BY created_at DESC`)
    .all() as Row[];
  return rows.map(rowToRecipe);
}

export function getRecipe(id: string): Recipe | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM recipes WHERE id = ?`).get(id) as
    | Row
    | undefined;
  return row ? rowToRecipe(row) : null;
}

export function createRecipe(input: RecipeInput): Recipe {
  const db = getDb();
  const id = randomUUID();
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO recipes (
      id, title, description, servings, prep_time, cook_time,
      ingredients, instructions, tags, source_pdf, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    input.description,
    input.servings,
    input.prepTime,
    input.cookTime,
    JSON.stringify(input.ingredients),
    JSON.stringify(input.instructions),
    JSON.stringify(input.tags),
    input.sourcePdf,
    createdAt
  );
  return { id, createdAt, ...input };
}

export function deleteRecipe(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM recipes WHERE id = ?`).run(id);
  return result.changes > 0;
}
