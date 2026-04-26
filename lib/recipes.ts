import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import { getDb } from "./db";
import { embeddingTextForRecipe, getEmbedding } from "./embeddings";
import type {
  IngredientGroup,
  Note,
  Nutrition,
  Recipe,
  RecipeInput,
} from "./types";

const SELECT_COLUMNS = `id, title, description, servings, prep_time, cook_time,
  ingredients, instructions, tags, images, nutrition, notes,
  source_pdf, created_at`;

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

function safeParseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseIngredientGroups(raw: string): IngredientGroup[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  // Old shape: array of strings — wrap in a single unnamed group.
  if (typeof parsed[0] === "string") {
    return [
      {
        name: "",
        items: (parsed as unknown[])
          .filter((s) => typeof s === "string" && (s as string).trim())
          .map((s) => ({ name: s as string, quantity: "" })),
      },
    ];
  }

  // New shape: array of groups.
  return (parsed as unknown[])
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
    .map((g) => ({
      name: typeof g.name === "string" ? g.name : "",
      items: Array.isArray(g.items)
        ? g.items
            .filter(
              (i): i is Record<string, unknown> => !!i && typeof i === "object"
            )
            .map((i) => ({
              name: typeof i.name === "string" ? i.name : "",
              quantity: typeof i.quantity === "string" ? i.quantity : "",
            }))
            .filter((i) => i.name)
        : [],
    }))
    .filter((g) => g.items.length > 0);
}

function parseNutrition(raw: string): Nutrition | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  const out: Nutrition = {};
  for (const k of [
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sodium",
  ] as const) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  if (Array.isArray(obj.other)) {
    const others = (obj.other as unknown[])
      .filter(
        (x): x is Record<string, unknown> => !!x && typeof x === "object"
      )
      .map((x) => ({
        label: typeof x.label === "string" ? x.label : "",
        value: typeof x.value === "string" ? x.value : "",
      }))
      .filter((x) => x.label && x.value);
    if (others.length) out.other = others;
  }
  if (
    !out.calories &&
    !out.protein &&
    !out.carbs &&
    !out.fat &&
    !out.fiber &&
    !out.sodium &&
    !out.other?.length
  ) {
    return null;
  }
  return out;
}

function parseNotes(raw: string): Note[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return (parsed as unknown[])
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n) => {
      const heading = typeof n.heading === "string" ? n.heading.trim() : "";
      const body =
        typeof n.body === "string" && n.body.trim() ? n.body.trim() : undefined;
      const items = Array.isArray(n.items)
        ? (n.items as unknown[])
            .filter((x) => typeof x === "string" && (x as string).trim())
            .map((x) => (x as string).trim())
        : undefined;
      return { heading, body, items: items && items.length ? items : undefined };
    })
    .filter((n) => n.heading && (n.body || (n.items && n.items.length)));
}

function rowToRecipe(row: Row): Recipe {
  return {
    id: asString(row.id),
    title: asString(row.title),
    description: asString(row.description),
    servings: asString(row.servings),
    prepTime: asString(row.prep_time),
    cookTime: asString(row.cook_time),
    ingredientGroups: parseIngredientGroups(asString(row.ingredients) || "[]"),
    instructions: safeParseStringArray(asString(row.instructions) || "[]"),
    tags: safeParseStringArray(asString(row.tags) || "[]"),
    images: safeParseStringArray(asString(row.images) || "[]"),
    nutrition: parseNutrition(asString(row.nutrition)),
    notes: parseNotes(asString(row.notes) || "[]"),
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

  // Text (LIKE) search: hits the JSON blobs of ingredients, tags, notes,
  // plus the title.
  const like = `%${q.toLowerCase()}%`;
  const textResult = await db.execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM recipes
          WHERE LOWER(title) LIKE ?
             OR LOWER(ingredients) LIKE ?
             OR LOWER(tags) LIKE ?
             OR LOWER(notes) LIKE ?
          ORDER BY created_at DESC`,
    args: [like, like, like, like],
  });

  // Semantic search: best-effort.
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
    "nutrition",
    "notes",
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
    JSON.stringify(input.ingredientGroups),
    JSON.stringify(input.instructions),
    JSON.stringify(input.tags),
    JSON.stringify(input.images),
    input.nutrition ? JSON.stringify(input.nutrition) : null,
    JSON.stringify(input.notes),
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
