import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
}: {
  params: { id: string };
}) {
  const recipe = await getRecipe(params.id);
  if (!recipe) notFound();

  return (
    <article className="space-y-8">
      <div>
        <Link
          href="/"
          className="text-sm text-stone-500 hover:text-brand-600"
        >
          ← All recipes
        </Link>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-2 text-stone-600">{recipe.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-500">
            {recipe.servings && <span>🍽 {recipe.servings}</span>}
            {recipe.prepTime && <span>⏱ Prep {recipe.prepTime}</span>}
            {recipe.cookTime && <span>🔥 Cook {recipe.cookTime}</span>}
          </div>
          {recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <DeleteButton id={recipe.id} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No ingredients found.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
              {recipe.ingredients.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Instructions</h2>
          {recipe.instructions.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No instructions found.</p>
          ) : (
            <ol className="mt-3 space-y-3 text-sm text-stone-700">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {recipe.sourcePdf && (
        <p className="text-xs text-stone-400">
          Extracted from{" "}
          <span className="font-mono">{recipe.sourcePdf}</span>
        </p>
      )}
    </article>
  );
}
