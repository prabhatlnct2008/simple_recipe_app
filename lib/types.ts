export type Ingredient = {
  name: string;
  quantity: string;
};

export type IngredientGroup = {
  name: string; // "" if ungrouped
  items: Ingredient[];
};

export type Nutrition = {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sodium?: string;
  other?: { label: string; value: string }[];
};

export type Note = {
  heading: string;
  body?: string;
  items?: string[];
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredientGroups: IngredientGroup[];
  instructions: string[];
  tags: string[];
  nutrition: Nutrition | null;
  notes: Note[];
  images: string[];
  sourcePdf: string;
  createdAt: number;
};

export type RecipeInput = Omit<Recipe, "id" | "createdAt">;
