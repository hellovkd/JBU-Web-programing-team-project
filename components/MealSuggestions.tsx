import Link from "next/link";
import type { SavedFavoriteFood } from "@/lib/favoriteFoods";
import { foodUnits, type Nutrients } from "@/lib/mealNutrition";
import { getMealSuggestions } from "@/lib/mealSuggestions";

type Props = {
  date: string;
  target?: Nutrients;
  consumed: Nutrients;
  favorites: SavedFavoriteFood[];
  hasMealRecords: boolean;
};

const display = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

export function MealSuggestions({ date, target, consumed, favorites, hasMealRecords }: Props) {
  const hasTarget = target && target.calories > 0;
  const result = hasTarget && hasMealRecords ? getMealSuggestions(target, consumed, favorites) : undefined;
  const nutrient = result?.priority;
  const remainingGrams = nutrient && result ? result.remaining[nutrient.key] : 0;
  const suggestions = result?.suggestions ?? [];
  let status;
  if (!hasTarget) status = "계산 기록에서 하루 목표를 저장하면 남은 영양소를 확인할 수 있어요.";
  else if (!hasMealRecords) status = "이 날짜의 식사를 기록하면 남은 영양소에 맞춰 음식을 추천해요.";
  else if (!nutrient) status = "이 날짜의 기록이 탄수화물·단백질·지방 목표를 모두 채웠어요.";
  else if (result && result.remaining.calories <= 0) status = "기록한 섭취량이 칼로리 목표에 도달했어요.";
  else if (!favorites.length) status = "내 음식에 저장한 항목이 생기면 여기에서 추천을 볼 수 있어요.";
  else if (!suggestions.length) status = "남은 목표량으로 추천할 수 있는 저장 음식이 없어요.";

  return (
    <section className="surface-panel meal-suggestions" aria-labelledby="meal-suggestions-heading">
      <header className="meal-suggestions-heading">
        <h2 id="meal-suggestions-heading">남은 영양소에 맞는 음식</h2>
        {nutrient ? (
          <p className={`meal-suggestions-target ${nutrient.key}`}>
            {nutrient.label} <strong>{display(remainingGrams)} g</strong> 남음
          </p>
        ) : null}
      </header>
      {status ? <p className="meal-suggestions-status">{status}</p> : null}
      {!hasTarget ? <Link href="/dashboard" className="text-link meal-suggestions-action">계산 기록 보기</Link> : null}
      {!favorites.length && result && result.remaining.calories > 0 && nutrient ? (
        <Link href="/foods" className="text-link meal-suggestions-action">내 음식 등록하기</Link>
      ) : null}
      {nutrient && suggestions.length ? (
        <ul className="meal-suggestions-list" role="list">
          {suggestions.map(({ food, amount, calories, grams }) => {
            const unit = foodUnits[food.unit];
            const amountLabel = `${display(amount)} ${unit}`;
            // 링크를 열면 해당 날짜의 기록 폼에 음식과 양을 채우고, 실제 저장은 폼에서 처리합니다.
            const href = {
              pathname: "/meals",
              query: { date, favorite: food.id, amount },
              hash: "meal-form-heading",
            };
            return (
              <li key={food.id} className="meal-suggestions-item">
                <h3>{food.name}</h3>
                <p className="meal-suggestions-amount">{amountLabel} 기준</p>
                <p className="meal-suggestions-values">
                  <span className={`meal-suggestions-macro ${nutrient.key}`}>{nutrient.label} {display(grams)} g</span>
                  <span>{display(calories)} kcal</span>
                </p>
                {amount !== food.baseAmount ? (
                  <p className="meal-suggestions-reference">
                    저장 기준량 {display(food.baseAmount)} {unit}에 {nutrient.label} {display(food.nutrients[nutrient.key])} g
                  </p>
                ) : null}
                <Link href={href} className="secondary-button meal-suggestions-action" aria-label={`${food.name} ${amountLabel} 식단에 추가`}>
                  식단에 추가
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
