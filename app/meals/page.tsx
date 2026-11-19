import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";
import { MealForm } from "@/components/MealForm";
import { MealSets, SaveMealSetForm } from "@/components/MealSets";
import { MealSuggestions } from "@/components/MealSuggestions";
import { getCurrentUser } from "@/lib/session";
import { getMealRecords } from "@/lib/meals";
import { getFavoriteFoods } from "@/lib/favoriteFoods";
import { getMacroRecords, resolveUserTarget } from "@/lib/macroRecords";
import { getMealSets } from "@/lib/mealSets";
import {
  foodUnits,
  formatNumber,
  getNextMealDate,
  getPreviousMealDate,
  getTodayDate,
  isValidMealDate,
  mealTypes,
  sumNutrition,
} from "@/lib/mealNutrition";

type Props = {
  searchParams: Promise<{
    date?: string;
    error?: string;
    notice?: string;
    favorite?: string;
    amount?: string;
  }>;
};
export const metadata = { title: "식단 기록" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  input: "음식 이름, 기준량·단위, 영양정보와 먹은 양을 확인해주세요.",
  "set-input": "세트 이름, 날짜와 끼니를 확인해주세요.",
  "set-empty": "선택한 날짜와 끼니에 저장할 음식 기록이 없습니다.",
  "set-size": "음식이 30개 이하인 구성만 세트로 저장할 수 있습니다.",
  "set-limit": "세트는 50개까지 저장할 수 있습니다. 사용하지 않는 세트를 삭제해주세요.",
  "set-duplicate": "같은 이름의 세트가 있습니다. 다른 이름으로 저장해주세요.",
  "set-missing": "세트를 찾을 수 없습니다. 내 세트 목록을 다시 확인해주세요.",
  "set-database": "식사 세트를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
};
const notices: Record<string, string> = {
  saved: "식단을 저장했습니다.",
  "set-saved": "식사 세트를 저장했습니다.",
  "set-applied": "선택한 날짜에 세트의 음식을 추가했습니다.",
  "set-deleted": "세트를 삭제했습니다. 식단 기록은 유지됩니다.",
};

// 개인 기록은 서버에서 세션을 확인하고 같은 소유자·식사일 조건으로 조회합니다.
export default async function MealsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/meals");
  const query = await searchParams;
  const today = getTodayDate();
  const validDate = typeof query.date === "string" && isValidMealDate(query.date);
  const date = validDate ? query.date! : today;
  const [records, favorites, calculations, sets] = await Promise.all([
    getMealRecords(user.id, date),
    getFavoriteFoods(user.id),
    getMacroRecords(user.id),
    getMealSets(user.id),
  ]);

  const previousDate = getPreviousMealDate(date);
  const nextDate = getNextMealDate(date);
  const yesterday = getPreviousMealDate(today);
  const consumed = sumNutrition(records.map((record) => record.totals));
  const { target } = resolveUserTarget(calculations[0], user.bodySpec);

  const matchedFavorite =
    typeof query.favorite === "string" ? favorites.find((item) => item.id === query.favorite) : undefined;
  const parsedAmount = typeof query.amount === "string" && query.amount.trim() ? Number(query.amount) : NaN;
  const initialFavoriteId = matchedFavorite?.id;
  const initialAmount =
    matchedFavorite && Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= 5000
      ? String(parsedAmount)
      : undefined;

  return (
    <main id="main" className="content-shell">
      <div className="page-heading">
        <h1>식단 기록</h1>
        <p>날짜별 식사를 기록하고 하루 섭취량과 부족한 영양소에 맞는 추천 음식을 확인하세요.</p>
      </div>
      {query.date && !validDate ? <p className="notice warning-notice" role="alert">날짜를 확인해주세요. 오늘 날짜의 기록을 표시합니다.</p> : null}
      {query.error ? <p className="notice error-notice" role="alert">{errors[query.error] ?? "식단을 저장하지 못했습니다. 다시 시도해주세요."}</p> : null}
      {query.notice && notices[query.notice] ? <p className="notice info-notice" role="status">{notices[query.notice]}</p> : null}
      {/* 날짜 조회는 읽기 전용 GET 요청이며 폼을 바꿔도 저장 기록을 수정하지 않습니다. */}
      <form action="/meals" method="get" className="meal-date-filter meal-date-toolbar">
        <div className="date-stepper">
          <Link
            href={`/meals?date=${previousDate}`}
            className="secondary-button date-step-button"
            aria-label={`이전 날 (${previousDate}) 식단 보기`}
          >
            <ChevronLeftIcon size={16} />
            <span>이전 날</span>
          </Link>
          <label htmlFor="meal-date" className="sr-only">식사 날짜</label>
          <div className="date-input-wrap">
            <CalendarIcon size={15} />
            <input id="meal-date" name="date" type="date" min="2000-01-01" max="2100-12-31" defaultValue={date} key={date} required />
          </div>
          <button className="secondary-button" type="submit">조회</button>
          <Link
            href={`/meals?date=${nextDate}`}
            className="secondary-button date-step-button"
            aria-label={`다음 날 (${nextDate}) 식단 보기`}
          >
            <span>다음 날</span>
            <ChevronRightIcon size={16} />
          </Link>
        </div>
        <div className="date-quick-links">
          <Link href="/meals" className="text-link">오늘</Link>
          <Link href={`/meals?date=${yesterday}`} className="text-link">어제</Link>
          <span className="date-tz-note">한국 날짜 기준</span>
        </div>
      </form>
      <MealSuggestions
        date={date}
        target={target}
        consumed={consumed}
        favorites={favorites}
        hasMealRecords={records.length > 0}
      />
      {records.length ? <div className="meal-set-day-action"><SaveMealSetForm date={date} scope="day" /></div> : null}
      <div className="meal-workspace">
        <MealForm
          key={`${date}-${initialFavoriteId ?? ""}-${initialAmount ?? ""}`}
          date={date}
          favorites={favorites}
          initialFavoriteId={initialFavoriteId}
          initialAmount={initialAmount}
        />
        <section className="meal-records" aria-labelledby="meal-records-heading">
          <div className="section-heading"><h2 id="meal-records-heading">{date} 기록</h2><span>음식 {records.length}개</span></div>
          {/* 고정된 네 끼니를 모두 표시하므로 빈 끼니와 저장된 기록을 구분할 수 있습니다. */}
          {Object.entries(mealTypes).map(([type, label]) => {
            const meals = records.filter((record) => record.mealType === type);
            const total = sumNutrition(meals.map((record) => record.totals));
            return (
              <section key={type} className="surface-panel meal-group" id={`meal-group-${type}`} aria-labelledby={`meal-group-${type}-heading`}>
                <div className="section-heading"><h3 id={`meal-group-${type}-heading`}>{label}</h3><span>{formatNumber(total.calories)} kcal</span></div>
                {meals.length ? <ul className="meal-record-list">{meals.map((meal) => (
                  <li key={meal.id}>
                    <div className="meal-record-name"><strong>{meal.name}</strong><span>{formatNumber(meal.amount)} {foodUnits[meal.unit]}</span></div>
                    <dl className="meal-record-nutrients">
                      <div><dt>칼로리</dt><dd>{formatNumber(meal.totals.calories)} kcal</dd></div>
                      <div><dt>탄수화물</dt><dd>{formatNumber(meal.totals.carbs)} g</dd></div>
                      <div><dt>단백질</dt><dd>{formatNumber(meal.totals.protein)} g</dd></div>
                      <div><dt>지방</dt><dd>{formatNumber(meal.totals.fat)} g</dd></div>
                    </dl>
                  </li>
                ))}</ul> : <p className="meal-empty">기록이 없습니다.</p>}
                {meals.length ? <SaveMealSetForm date={date} scope={type as keyof typeof mealTypes} /> : null}
              </section>
            );
          })}
          <p className="meal-record-note">영양정보는 소수 첫째 자리까지 표시합니다.</p>
        </section>
      </div>
      <MealSets sets={sets} date={date} />
    </main>
  );
}
