import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
      <h1 className="text-xl font-semibold">Recipe not found</h1>
      <p className="mt-1 text-sm text-stone-500">
        Maybe it was deleted, or the link is wrong.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Back to recipes
      </Link>
    </div>
  );
}
