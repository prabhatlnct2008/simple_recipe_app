import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromText } from "@/lib/openai";
import { createRecipe } from "@/lib/recipes";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 50_000;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 600_000; // ~600 KB per image (data URI string length)

function isValidDataUri(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/") &&
    value.includes(";base64,") &&
    value.length <= MAX_IMAGE_BYTES
  );
}

export async function POST(req: NextRequest) {
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

  let imageList: string[] = [];
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
    const message = err instanceof Error ? err.message : "Failed to parse recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sourceLabel =
    typeof label === "string" && label.trim() ? label.trim() : "Pasted text";

  const recipe = await createRecipe({
    ...parsed,
    images: imageList,
    sourcePdf: sourceLabel,
  });

  return NextResponse.json({ recipe });
}
