import type { SavedFavoriteFood } from "@/lib/favoriteFoods";
import { foodUnits, nutrientFields, remainingNutrition, validateFoodInput, type Nutrients } from "@/lib/mealNutrition";

export type MacroKey = "carbs" | "protein" | "fat";
type NutrientKey = keyof Nutrients;
export type NutrientStatus = "deficient" | "balanced" | "over";

type NutrientGap = {
  key: NutrientKey;
  label: string;
  unit: string;
  target: number;
  consumed: number;
  remaining: number;
  achievementRate: number;
  status: NutrientStatus;
};

type Suggestion = {
  food: SavedFavoriteFood;
  amount: number;
  calories: number;
  grams: number;
  carbs: number;
  protein: number;
  fat: number;
};

type CuratedGuideFood = {
  id: string;
  name: string;
  searchQuery: string;
  focusMacro: MacroKey;
  category: string;
  reason: string;
  baseAmount: number;
  unit: keyof typeof foodUnits;
  step: number;
  maxAmount: number;
  nutrients: Nutrients;
};

type RecommendedGuideFood = {
  item: CuratedGuideFood;
  amount: number;
  calories: number;
  grams: number;
  carbs: number;
  protein: number;
  fat: number;
};

type MealSuggestionAnalysis = {
  gaps: NutrientGap[];
  deficientMacros: NutrientGap[];
  priority: NutrientGap | undefined;
  remaining: Nutrients;
  suggestions: Suggestion[];
  guideFoods: RecommendedGuideFood[];
};

const PORTIONS = {
  g: { step: 10, limit: 250 },
  ml: { step: 10, limit: 300 },
  piece: { step: 1, limit: 3 },
  serving: { step: 0.25, limit: 1 },
} as const;

// 식약처 식품영양성분DB 기반의 일상 식단 참고용 가이드 카탈로그입니다.
const CURATED_GUIDE_FOODS: readonly CuratedGuideFood[] = [
  {
    id: "guide-chicken-breast",
    name: "닭가슴살",
    searchQuery: "닭가슴살",
    focusMacro: "protein",
    category: "고단백 식품",
    reason: "지방과 탄수화물 부담 없이 순수 단백질을 채우기 좋아요.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 200,
    nutrients: { calories: 109, carbs: 0.5, protein: 23, fat: 1.2 },
  },
  {
    id: "guide-egg",
    name: "삶은 달걀",
    searchQuery: "달걀",
    focusMacro: "protein",
    category: "간편 단백질",
    reason: "개수 단위로 양 조절이 쉽고 아미노산 균형이 좋아요.",
    baseAmount: 1,
    unit: "piece",
    step: 1,
    maxAmount: 3,
    nutrients: { calories: 77, carbs: 0.6, protein: 6.3, fat: 5.3 },
  },
  {
    id: "guide-greek-yogurt",
    name: "그릭요거트 (무가당)",
    searchQuery: "그릭요거트",
    focusMacro: "protein",
    category: "유제품 단백질",
    reason: "간식이나 아침에 부담 없이 단백질과 포만감을 보충해요.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 200,
    nutrients: { calories: 95, carbs: 4.5, protein: 10, fat: 4 },
  },
  {
    id: "guide-tofu",
    name: "두부",
    searchQuery: "두부",
    focusMacro: "protein",
    category: "식물성 단백질",
    reason: "열량이 낮아 칼로리 여유가 적을 때도 단백질 보충이 가능해요.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 250,
    nutrients: { calories: 84, carbs: 2.3, protein: 9.3, fat: 4.7 },
  },
  {
    id: "guide-salmon",
    name: "연어 구이",
    searchQuery: "연어",
    focusMacro: "protein",
    category: "어류 단백질",
    reason: "단백질과 불포화지방을 한 번에 보충하기 좋습니다.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 180,
    nutrients: { calories: 180, carbs: 0, protein: 20, fat: 10.5 },
  },
  {
    id: "guide-protein-shake",
    name: "단백질 음료",
    searchQuery: "단백질",
    focusMacro: "protein",
    category: "간편 보충",
    reason: "바쁜 일정에도 빠르고 정확하게 부족한 단백질을 채워요.",
    baseAmount: 250,
    unit: "ml",
    step: 50,
    maxAmount: 500,
    nutrients: { calories: 130, carbs: 5, protein: 20, fat: 2.5 },
  },
  {
    id: "guide-brown-rice",
    name: "현미밥",
    searchQuery: "현미밥",
    focusMacro: "carbs",
    category: "복합 탄수화물",
    reason: "식이섬유가 풍부해 혈당을 완만하게 올리며 에너지를 공급해요.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 250,
    nutrients: { calories: 155, carbs: 34, protein: 3.1, fat: 0.9 },
  },
  {
    id: "guide-sweet-potato",
    name: "찐 고구마",
    searchQuery: "고구마",
    focusMacro: "carbs",
    category: "복합 탄수화물",
    reason: "지방이 거의 없고 포만감이 커서 탄수화물 보충에 적합해요.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 250,
    nutrients: { calories: 128, carbs: 30, protein: 1.6, fat: 0.2 },
  },
  {
    id: "guide-oatmeal",
    name: "오트밀",
    searchQuery: "오트밀",
    focusMacro: "carbs",
    category: "통곡물",
    reason: "복합 탄수화물과 함께 소량의 단백질도 보충할 수 있어요.",
    baseAmount: 50,
    unit: "g",
    step: 10,
    maxAmount: 100,
    nutrients: { calories: 190, carbs: 33, protein: 6.5, fat: 3.4 },
  },
  {
    id: "guide-banana",
    name: "바나나",
    searchQuery: "바나나",
    focusMacro: "carbs",
    category: "간편 탄수화물",
    reason: "운동 전후 빠르게 에너지를 보충할 때 부담이 적습니다.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 200,
    nutrients: { calories: 89, carbs: 22.8, protein: 1.1, fat: 0.3 },
  },
  {
    id: "guide-multigrain-rice",
    name: "잡곡밥",
    searchQuery: "잡곡밥",
    focusMacro: "carbs",
    category: "주식",
    reason: "한 끼 식사에서 부족한 탄수화물을 안정적으로 채워줍니다.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 250,
    nutrients: { calories: 162, carbs: 35.5, protein: 3.4, fat: 0.6 },
  },
  {
    id: "guide-whole-wheat-bread",
    name: "통밀식빵",
    searchQuery: "통밀식빵",
    focusMacro: "carbs",
    category: "베이커리",
    reason: "아침이나 간식으로 간편하게 탄수화물을 조절하기 좋아요.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 150,
    nutrients: { calories: 247, carbs: 43, protein: 9.5, fat: 3.5 },
  },
  {
    id: "guide-almond",
    name: "구운 아몬드",
    searchQuery: "아몬드",
    focusMacro: "fat",
    category: "불포화지방",
    reason: "적은 양으로도 양질의 불포화지방과 비타민E를 채워줘요.",
    baseAmount: 30,
    unit: "g",
    step: 5,
    maxAmount: 50,
    nutrients: { calories: 174, carbs: 6.5, protein: 6.3, fat: 15 },
  },
  {
    id: "guide-avocado",
    name: "아보카도",
    searchQuery: "아보카도",
    focusMacro: "fat",
    category: "식물성 지방",
    reason: "샐러드나 밥에 곁들이기 좋은 건강한 단일불포화지방 급원입니다.",
    baseAmount: 100,
    unit: "g",
    step: 10,
    maxAmount: 150,
    nutrients: { calories: 160, carbs: 8.5, protein: 2, fat: 14.7 },
  },
  {
    id: "guide-olive-oil",
    name: "올리브유",
    searchQuery: "올리브유",
    focusMacro: "fat",
    category: "오일",
    reason: "탄수화물·단백질 변화 없이 순수 지방만 정밀하게 맞춰줍니다.",
    baseAmount: 10,
    unit: "g",
    step: 5,
    maxAmount: 25,
    nutrients: { calories: 88, carbs: 0, protein: 0, fat: 10 },
  },
  {
    id: "guide-walnut",
    name: "호두",
    searchQuery: "호두",
    focusMacro: "fat",
    category: "견과류",
    reason: "오메가-3 지방산이 풍부해 적은 양으로 지방 목표를 채워요.",
    baseAmount: 30,
    unit: "g",
    step: 5,
    maxAmount: 45,
    nutrients: { calories: 196, carbs: 4.1, protein: 4.6, fat: 19.6 },
  },
  {
    id: "guide-peanut-butter",
    name: "무가당 땅콩버터",
    searchQuery: "땅콩버터",
    focusMacro: "fat",
    category: "견과 스프레드",
    reason: "지방과 함께 소량의 단백질 보충에도 활용할 수 있어요.",
    baseAmount: 20,
    unit: "g",
    step: 5,
    maxAmount: 40,
    nutrients: { calories: 118, carbs: 4, protein: 5, fat: 10 },
  },
  {
    id: "guide-cheese",
    name: "체다 슬라이스 치즈",
    searchQuery: "치즈",
    focusMacro: "fat",
    category: "유제품",
    reason: "장 단위로 간편하게 지방과 단백질을 함께 더할 수 있어요.",
    baseAmount: 1,
    unit: "piece",
    step: 1,
    maxAmount: 3,
    nutrients: { calories: 65, carbs: 0.8, protein: 4, fat: 5.2 },
  },
];

const roundOne = (value: number) => Math.round(value * 10) / 10;

export function analyzeNutrientGaps(target: Nutrients, consumed: Nutrients) {
  const remaining = remainingNutrition(target, consumed);
  const gaps: NutrientGap[] = nutrientFields.map(({ key, label, unit }) => {
    const goal = target[key];
    const taken = consumed[key];
    const rest = remaining[key];
    const achievementRate = goal > 0 ? Math.round((taken / goal) * 100) : 0;
    const overThreshold = key === "calories" ? -20 : -0.5;
    const deficientThreshold = key === "calories" ? 30 : 0.5;

    let status: NutrientStatus = "balanced";
    if (rest < overThreshold) status = "over";
    else if (goal > 0 && rest > deficientThreshold && achievementRate < 90) status = "deficient";

    return {
      key,
      label,
      unit,
      target: goal,
      consumed: taken,
      remaining: rest,
      achievementRate,
      status,
    };
  });

  const deficientMacros = gaps
    .filter((gap): gap is NutrientGap & { key: MacroKey } => gap.key !== "calories" && gap.target > 0 && gap.remaining > 0.5)
    .sort((a, b) => b.remaining / b.target - a.remaining / a.target);

  return { gaps, deficientMacros, remaining };
}

function fitPortion(
  nutrients: Nutrients,
  baseAmount: number,
  step: number,
  maxAmount: number,
  remaining: Nutrients,
): number {
  let amount = maxAmount;
  for (const { key } of nutrientFields) {
    const value = nutrients[key];
    if (value > 0) {
      amount = Math.min(amount, (Math.max(0, remaining[key]) / value) * baseAmount);
    }
  }
  const stepped = Math.floor(amount / step) * step;
  return Number(stepped.toFixed(2));
}

function getCuratedRecommendations(
  target: Nutrients,
  consumed: Nutrients,
  focusMacro: MacroKey,
): RecommendedGuideFood[] {
  const remaining = remainingNutrition(target, consumed);
  if (remaining.calories <= 15 || remaining[focusMacro] <= 0.5) return [];

  return CURATED_GUIDE_FOODS.filter((item) => item.focusMacro === focusMacro)
    .map((item) => {
      // 남은 열량·영양소에 맞는 양을 우선 찾되, 소량이라도 부족 영양소를 채울 수 있게 계산합니다.
      const amount = fitPortion(item.nutrients, item.baseAmount, item.step, item.maxAmount, remaining);
      if (amount <= 0) return null;
      const ratio = amount / item.baseAmount;
      const grams = roundOne(item.nutrients[focusMacro] * ratio);
      if (grams < 0.5) return null;
      return {
        item,
        amount,
        calories: roundOne(item.nutrients.calories * ratio),
        grams,
        carbs: roundOne(item.nutrients.carbs * ratio),
        protein: roundOne(item.nutrients.protein * ratio),
        fat: roundOne(item.nutrients.fat * ratio),
      };
    })
    .filter((entry): entry is RecommendedGuideFood => entry !== null)
    .sort((a, b) => b.grams - a.grams || a.calories - b.calories)
    .slice(0, 4);
}

export function getMealSuggestions(
  target: Nutrients,
  consumed: Nutrients,
  favorites: SavedFavoriteFood[],
  preferredMacro?: MacroKey,
): MealSuggestionAnalysis {
  const { gaps, deficientMacros, remaining } = analyzeNutrientGaps(target, consumed);
  const selectedPriority =
    (preferredMacro ? deficientMacros.find((gap) => gap.key === preferredMacro) : undefined) ?? deficientMacros[0];

  if (!deficientMacros.length || remaining.calories <= 0 || !selectedPriority) {
    return {
      gaps,
      deficientMacros,
      priority: selectedPriority,
      remaining,
      suggestions: [],
      guideFoods: [],
    };
  }

  const portionsInBudget = [];
  for (const food of favorites) {
    if (validateFoodInput(food) || food.nutrients.calories <= 0) continue;
    const { step, limit } = PORTIONS[food.unit];
    // 저장한 기준량과 일반 상한 중 큰 범위 안에서 남은 목표에 맞는 분량을 계산합니다.
    const cap = Math.max(food.baseAmount, limit);
    const amount = fitPortion(food.nutrients, food.baseAmount, step, cap, remaining);
    if (amount <= 0) continue;
    const ratio = amount / food.baseAmount;
    portionsInBudget.push({
      food,
      amount,
      ratio,
      calories: roundOne(food.nutrients.calories * ratio),
      carbs: roundOne(food.nutrients.carbs * ratio),
      protein: roundOne(food.nutrients.protein * ratio),
      fat: roundOne(food.nutrients.fat * ratio),
    });
  }

  // 사용자가 특정 부족 영양소를 골랐다면 해당 영양소 기준으로 추천을 우선 산출합니다.
  const orderedPriorities = preferredMacro
    ? [selectedPriority, ...deficientMacros.filter((item) => item.key !== selectedPriority.key)]
    : deficientMacros;

  let priority = selectedPriority;
  let suggestions: Suggestion[] = [];
  for (const candidate of orderedPriorities) {
    const matched = portionsInBudget
      .map((entry) => ({
        food: entry.food,
        amount: entry.amount,
        calories: entry.calories,
        grams: roundOne(entry.food.nutrients[candidate.key] * entry.ratio),
        carbs: entry.carbs,
        protein: entry.protein,
        fat: entry.fat,
      }))
      .filter((entry) => entry.grams >= 0.5)
      .sort((a, b) => b.grams - a.grams || a.calories - b.calories)
      .slice(0, 3);
    if (matched.length) {
      priority = candidate;
      suggestions = matched;
      break;
    }
    if (preferredMacro) break;
  }

  const guideFoods = getCuratedRecommendations(target, consumed, priority.key);

  return {
    gaps,
    deficientMacros,
    priority,
    remaining,
    suggestions,
    guideFoods,
  };
}
