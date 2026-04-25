import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromText } from "@/lib/openai";
import { createRecipe } from "@/lib/recipes";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 50_000;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 600_000;

function isValidDataUri(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/") &&
    value.includes(";base64,") &&
    value.length <= MAX_IMAGE_BYTES
  );
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { text, label, images } = (body ?? {}) as {
      text?: unknown;
      label?: unknown;
      images?: unknown;
    };

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Recipe text is required" },
        { status: 400 }
      );
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` },
        { status: 400 }
      );
    }

    const imageList: string[] = [];
    if (Array.isArray(images)) {
      if (images.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Too many images (max ${MAX_IMAGES})` },
          { status: 400 }
        );
      }
      for (const img of images) {
        if (!isValidDataUri(img)) {
          return NextResponse.json(
            { error: "One or more images are invalid or too large" },
            { status: 400 }
          );
        }
        imageList.push(img);
      }
    }

    let parsed;
    try {
      parsed = await extractRecipeFromText(text);
    } catch (err) {
      console.error("[recipes/text] OpenAI extraction failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to parse recipe";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const sourceLabel =
      typeof label === "string" && label.trim() ? label.trim() : "Pasted text";

    let recipe;
    try {
      recipe = await createRecipe({
        ...parsed,
        images: imageList,
        sourcePdf: sourceLabel,
      });
    } catch (err) {
      console.error("[recipes/text] Database write failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save recipe";
      return NextResponse.json(
        { error: `Database error: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("[recipes/text] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
