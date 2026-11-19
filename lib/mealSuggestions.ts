import type { SavedFavoriteFood } from "@/lib/favoriteFoods";
import { nutrientFields, remainingNutrition, validateFoodInput, type Nutrients } from "@/lib/mealNutrition";

const macros = nutrientFields.filter((field) => field.key !== "calories");

// 저장된 기준량 안에서 고르고, 기록 폼에서 입력하기 쉬운 단위로 양을 내립니다.
const portions = {
  g: { step: 1, limit: 250 },
  ml: { step: 1, limit: 300 },
  piece: { step: 1, limit: 3 },
  serving: { step: 0.25, limit: 1 },
} as const;

type Suggestion = {
  food: SavedFavoriteFood;
  amount: number;
  calories: number;
  grams: number;
};

export function getMealSuggestions(
  target: Nutrients,
  consumed: Nutrients,
  favorites: SavedFavoriteFood[],
): { priority: (typeof macros)[number] | undefined; remaining: Nutrients; suggestions: Suggestion[] } {
  const remaining = remainingNutrition(target, consumed);
  const priorities = macros
    .filter(({ key }) => target[key] > 0 && remaining[key] > 0)
    .sort((a, b) => remaining[b.key] / target[b.key] - remaining[a.key] / target[a.key]);
  const noSuggestions = { priority: priorities[0], remaining, suggestions: [] };

  if (!priorities.length || remaining.calories <= 0) return noSuggestions;

  const portionsInBudget = [];
  for (const food of favorites) {
    if (validateFoodInput(food) || food.nutrients.calories <= 0) continue;

    // 기준량에 대한 비율을 남은 열량과 탄단지 모두에 맞춰 더 작은 양으로 조정합니다.
    const { step, limit } = portions[food.unit];
    let amount = Math.min(food.baseAmount, limit);
    for (const { key } of nutrientFields) {
      const value = food.nutrients[key];
      if (value > 0) {
        amount = Math.min(amount, (Math.max(0, remaining[key]) / value) * food.baseAmount);
      }
    }
    amount = Math.floor(amount / step) * step;
    if (amount <= 0) continue;
    const ratio = amount / food.baseAmount;
    portionsInBudget.push({ food, amount, ratio, calories: food.nutrients.calories * ratio });
  }

  // 첫 영양소에 맞는 음식이 없으면 다음으로 남은 비율이 큰 영양소를 확인합니다.
  for (const priority of priorities) {
    const suggestions = portionsInBudget
      .map(({ food, amount, ratio, calories }) => ({ food, amount, calories, grams: food.nutrients[priority.key] * ratio }))
      .filter(({ grams }) => grams >= 0.1)
      .sort((a, b) => b.grams - a.grams || a.calories - b.calories)
      .slice(0, 3);
    if (suggestions.length) return { priority, remaining, suggestions };
  }

  return noSuggestions;
}
