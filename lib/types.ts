export type Recipe = {
  id: string;
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourcePdf: string;
  createdAt: number;
};

export type RecipeInput = Omit<Recipe, "id" | "createdAt">;
