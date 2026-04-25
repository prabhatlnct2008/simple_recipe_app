import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import { getDb } from "./db";
import type { Recipe, RecipeInput } from "./types";

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
    sourcePdf: asString(row.source_pdf),
    createdAt: asNumber(row.created_at),
  };
}

export async function listRecipes(query?: string): Promise<Recipe[]> {
  const db = await getDb();
  if (query && query.trim().length > 0) {
    const like = `%${query.trim().toLowerCase()}%`;
    const result = await db.execute({
      sql: `SELECT * FROM recipes
            WHERE LOWER(title) LIKE ?
               OR LOWER(ingredients) LIKE ?
               OR LOWER(tags) LIKE ?
            ORDER BY created_at DESC`,
      args: [like, like, like],
    });
    return result.rows.map(rowToRecipe);
  }
  const result = await db.execute(
    `SELECT * FROM recipes ORDER BY created_at DESC`
  );
  return result.rows.map(rowToRecipe);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM recipes WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToRecipe(row) : null;
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const db = await getDb();
  const id = randomUUID();
  const createdAt = Date.now();
  await db.execute({
    sql: `INSERT INTO recipes (
      id, title, description, servings, prep_time, cook_time,
      ingredients, instructions, tags, source_pdf, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
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
      createdAt,
    ],
  });
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
