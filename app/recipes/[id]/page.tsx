import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import type { Nutrition } from "@/lib/types";

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
        <Link href="/" className="text-sm text-stone-500 hover:text-brand-600">
          ← All recipes
        </Link>
      </div>

      <header>
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
      </header>

      {recipe.images.length > 0 && (
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recipe.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${recipe.title} photo ${i + 1}`}
                className="aspect-square w-full rounded-md border border-stone-200 object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          {recipe.ingredientGroups.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No ingredients found.</p>
          ) : (
            <div className="mt-3 space-y-5">
              {recipe.ingredientGroups.map((group, gi) => (
                <div key={gi}>
                  {group.name && (
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                      {group.name}
                    </h3>
                  )}
                  <ul className="mt-2 divide-y divide-stone-100 text-sm">
                    {group.items.map((item, ii) => (
                      <li
                        key={ii}
                        className="flex items-start justify-between gap-3 py-1.5"
                      >
                        <span className="text-stone-700">{item.name}</span>
                        {item.quantity && (
                          <span className="shrink-0 text-stone-500">
                            {item.quantity}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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

      {recipe.nutrition && <NutritionTable nutrition={recipe.nutrition} />}

      {recipe.notes.length > 0 && (
        <section className="space-y-4">
          {recipe.notes.map((note, i) => (
            <div
              key={i}
              className="rounded-lg border border-stone-200 bg-white p-5"
            >
              <h3 className="text-base font-semibold text-stone-900">
                {note.heading}
              </h3>
              {note.body && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">
                  {note.body}
                </p>
              )}
              {note.items && note.items.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                  {note.items.map((item, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-brand-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {recipe.sourcePdf && (
        <p className="text-xs text-stone-400">
          Source: <span className="font-mono">{recipe.sourcePdf}</span>
        </p>
      )}
    </article>
  );
}

function NutritionTable({ nutrition }: { nutrition: Nutrition }) {
  const rows: { label: string; value: string }[] = [];
  if (nutrition.calories) rows.push({ label: "Calories", value: nutrition.calories });
  if (nutrition.protein) rows.push({ label: "Protein", value: nutrition.protein });
  if (nutrition.carbs) rows.push({ label: "Carbs", value: nutrition.carbs });
  if (nutrition.fat) rows.push({ label: "Fat", value: nutrition.fat });
  if (nutrition.fiber) rows.push({ label: "Fiber", value: nutrition.fiber });
  if (nutrition.sodium) rows.push({ label: "Sodium", value: nutrition.sodium });
  if (nutrition.other) rows.push(...nutrition.other);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Nutrition</h2>
      <p className="text-xs text-stone-500">Per serving (approximate)</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between border-b border-stone-100 py-1">
            <dt className="text-stone-500">{r.label}</dt>
            <dd className="font-medium text-stone-800">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
