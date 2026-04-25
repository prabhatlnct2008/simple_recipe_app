import { listRecipes } from "@/lib/recipes";
import UploadCard from "@/components/UploadCard";
import SearchBar from "@/components/SearchBar";
import RecipeCard from "@/components/RecipeCard";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const recipes = await listRecipes(q || undefined);

  return (
    <div className="space-y-6">
      <UploadCard />

      <div className="space-y-3">
        <SearchBar />
        {q && (
          <p className="text-sm text-stone-500">
            {recipes.length} result{recipes.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </p>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-stone-700">
            {q ? "No recipes match your search." : "No recipes yet."}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {q
              ? "Try a different keyword."
              : "Upload your first PDF to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
