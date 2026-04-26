import { createClient, type Client } from "@libsql/client";

let clientInstance: Client | null = null;
let initPromise: Promise<Client> | null = null;

async function init(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  const client = createClient({ url, authToken });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      servings TEXT NOT NULL DEFAULT '',
      prep_time TEXT NOT NULL DEFAULT '',
      cook_time TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '[]',
      instructions TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      images TEXT NOT NULL DEFAULT '[]',
      nutrition TEXT,
      notes TEXT NOT NULL DEFAULT '[]',
      source_pdf TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      embedding F32_BLOB(1536)
    )
  `);
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC)`
  );

  // Migrate older deployments that pre-date the images column.
  const cols = await client.execute(`PRAGMA table_info(recipes)`);
  const colNames = new Set(cols.rows.map((r) => String(r.name)));
  if (!colNames.has("images")) {
    await client.execute(
      `ALTER TABLE recipes ADD COLUMN images TEXT NOT NULL DEFAULT '[]'`
    );
  }
  if (!colNames.has("embedding")) {
    // F32_BLOB is libSQL's native vector column (Turso vector search).
    await client.execute(
      `ALTER TABLE recipes ADD COLUMN embedding F32_BLOB(1536)`
    );
  }
  if (!colNames.has("nutrition")) {
    await client.execute(`ALTER TABLE recipes ADD COLUMN nutrition TEXT`);
  }
  if (!colNames.has("notes")) {
    await client.execute(
      `ALTER TABLE recipes ADD COLUMN notes TEXT NOT NULL DEFAULT '[]'`
    );
  }

  return client;
}

export async function getDb(): Promise<Client> {
  if (clientInstance) return clientInstance;
  if (!initPromise) {
    initPromise = init().then((c) => {
      clientInstance = c;
      return c;
    });
  }
  return initPromise;
}
