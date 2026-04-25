import Link from "next/link";
import type { Recipe } from "@/lib/types";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:border-brand-500 hover:shadow"
    >
      {recipe.images[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.images[0]}
          alt={recipe.title}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-stone-900">{recipe.title}</h3>
      {recipe.description && (
        <p className="mt-1 line-clamp-2 text-sm text-stone-600">
          {recipe.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
        {recipe.servings && <span>🍽 {recipe.servings}</span>}
        {recipe.prepTime && <span>⏱ prep {recipe.prepTime}</span>}
        {recipe.cookTime && <span>🔥 cook {recipe.cookTime}</span>}
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
    </Link>
  );
}
