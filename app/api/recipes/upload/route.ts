import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf";
import { extractRecipeFromText } from "@/lib/openai";
import { createRecipe } from "@/lib/recipes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    text = await extractPdfText(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not read PDF. Is the file a valid PDF?" },
      { status: 400 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "PDF appears to contain no text (is it scanned images?)" },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed = await extractRecipeFromText(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const recipe = await createRecipe({
    ...parsed,
    sourcePdf: file.name,
  });

  return NextResponse.json({ recipe });
}
