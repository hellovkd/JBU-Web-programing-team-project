import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";
import { MealStats } from "@/components/MealStats";
import { getMacroRecords, resolveUserTarget } from "@/lib/macroRecords";
import {
  getNextMealDate,
  getPreviousMealDate,
  getTodayDate,
  isValidMealDate,
  nutrientFields,
  type Nutrients,
} from "@/lib/mealNutrition";
import { getMealStatsBundle, type MealStatDays } from "@/lib/mealStats";
import { getCurrentUser } from "@/lib/session";

type Props = {
  searchParams: Promise<{ days?: string; metric?: string; date?: string }>;
};

export const metadata = { title: "식단 통계" };
export const dynamic = "force-dynamic";

const ALLOWED_METRICS = new Set<keyof Nutrients>(nutrientFields.map((field) => field.key));

export default async function MealStatsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/meals/stats");

  const query = await searchParams;
  const today = getTodayDate();
  const validDate = typeof query.date === "string" && isValidMealDate(query.date);
  const anchorDate = validDate ? query.date! : today;

  const days: MealStatDays = query.days === "1" ? 1 : query.days === "30" ? 30 : 7;
  const metric: keyof Nutrients =
    typeof query.metric === "string" && ALLOWED_METRICS.has(query.metric as keyof Nutrients)
      ? (query.metric as keyof Nutrients)
      : "calories";

  const [bundle, calculations] = await Promise.all([
    getMealStatsBundle(user.id, days, anchorDate),
    getMacroRecords(user.id),
  ]);

  const { target } = resolveUserTarget(calculations[0], user.bodySpec);

  const previousDate = getPreviousMealDate(anchorDate);
  const nextDate = getNextMealDate(anchorDate);

  return (
    <main id="main" className="content-shell">
      <div className="page-heading">
        <h1>식단 통계</h1>
        <p>1일 · 7일 · 30일 기준으로 날짜별 기록과 영양소 섭취 추이를 한눈에 비교합니다.</p>
      </div>

      {query.date && !validDate ? (
        <p className="notice warning-notice" role="alert">
          날짜를 확인해주세요. 오늘({today}) 기준으로 통계를 표시합니다.
        </p>
      ) : null}

      <form action="/meals/stats" method="get" className="meal-date-filter meal-date-toolbar">
        <input type="hidden" name="days" value={days} />
        <input type="hidden" name="metric" value={metric} />
        <div className="date-stepper">
          <Link
            href={{ pathname: "/meals/stats", query: { days, metric, date: previousDate } }}
            className="secondary-button date-step-button"
            aria-label={`기준일 이전 날 (${previousDate}) 통계`}
          >
            <ChevronLeftIcon size={16} />
            <span>이전 날</span>
          </Link>
          <label htmlFor="stats-anchor-date" className="sr-only">통계 기준 날짜</label>
          <div className="date-input-wrap">
            <CalendarIcon size={15} />
            <input
              id="stats-anchor-date"
              name="date"
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              defaultValue={anchorDate}
              key={anchorDate}
              required
            />
          </div>
          <button className="secondary-button" type="submit">기준일 적용</button>
          <Link
            href={{ pathname: "/meals/stats", query: { days, metric, date: nextDate } }}
            className="secondary-button date-step-button"
            aria-label={`기준일 다음 날 (${nextDate}) 통계`}
          >
            <span>다음 날</span>
            <ChevronRightIcon size={16} />
          </Link>
        </div>
        <div className="date-quick-links">
          <Link href={{ pathname: "/meals/stats", query: { days, metric } }} className="text-link">
            오늘 기준
          </Link>
          <span className="date-tz-note">기준일: {anchorDate} (한국 날짜)</span>
        </div>
      </form>

      <MealStats
        key={`${days}-${metric}-${anchorDate}`}
        bundle={bundle}
        metric={metric}
        target={target}
        today={today}
      />
    </main>
  );
}
