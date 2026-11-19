import Link from "next/link";
import { redirect } from "next/navigation";
import { CoachHeroCard } from "@/components/CoachBear";
import {
  ArrowUpRightIcon,
  ChartBarIcon,
  MealsIcon,
  ScaleIcon,
} from "@/components/Icons";
import { MealSuggestions } from "@/components/MealSuggestions";
import { getDashboardCoachBriefing } from "@/lib/coachTips";
import { getFavoriteFoods } from "@/lib/favoriteFoods";
import { goals } from "@/lib/macroCalculator";
import { getMacroRecords, resolveUserTarget } from "@/lib/macroRecords";
import {
  axisCeiling,
  formatNumber as format,
  formatShortDate,
  formatWeekday,
  getTodayDate,
  sumNutrition,
} from "@/lib/mealNutrition";
import { getMealStatsBundle } from "@/lib/mealStats";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "대시보드" };
export const dynamic = "force-dynamic";

// 로그인 사용자의 오늘 섭취 현황, 부족 영양소 추천, 최근 7일 추이, 끼니/목표 요약을 한곳에 보여줍니다.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const today = getTodayDate();
  const [favorites, calculations, statsBundle] = await Promise.all([
    getFavoriteFoods(user.id),
    getMacroRecords(user.id),
    getMealStatsBundle(user.id, 7, today),
  ]);

  const records = statsBundle.dayRecords;
  const consumed = sumNutrition(records.map((record) => record.totals));
  const { condition, target, bmr, tdee } = resolveUserTarget(calculations[0], user.bodySpec);

  const goalLabel = condition ? goals[condition.goal].label : undefined;
  const goalBadge = condition
    ? `체중 ${condition.weight}kg`
    : undefined;

  const recorded7 = statsBundle.entries.filter((entry) => entry.nutrients !== null);
  const recordedCount7 = recorded7.length;
  const totalCalories7 = recorded7.reduce((sum, entry) => sum + (entry.nutrients?.calories ?? 0), 0);
  const avgCalories7 = recordedCount7 > 0 ? totalCalories7 / recordedCount7 : 0;
  const highestCalories7 = recorded7.reduce(
    (max, entry) => Math.max(max, entry.nutrients?.calories ?? 0),
    0,
  );
  const chartCeiling = axisCeiling(Math.max(highestCalories7, target?.calories ?? 0), 1000);

  const calorieSummary = {
    consumed: Math.round(consumed.calories),
    target: target?.calories ?? 0,
    remaining: target ? Math.round(target.calories - consumed.calories) : 0,
    rate:
      target && target.calories > 0
        ? Math.round((consumed.calories / target.calories) * 100)
        : 0,
    mealCount: records.length,
    recordedDays7: recordedCount7,
  };

  const briefing = getDashboardCoachBriefing({
    userName: user.name,
    consumed,
    target,
    mealCount: records.length,
    recordedDays7: recordedCount7,
    goalLabel,
  });

  // 7일 미니 막대 그래프 좌표 계산
  const svgW = 580;
  const svgH = 210;
  const pad = { top: 24, right: 16, bottom: 40, left: 48 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;
  const slotW = plotW / statsBundle.entries.length;
  const barW = Math.min(38, slotW * 0.48);
  const targetLineY =
    target && target.calories > 0
      ? pad.top + plotH * (1 - target.calories / chartCeiling)
      : null;

  return (
    <main id="main" className="content-shell dashboard-shell">
      <CoachHeroCard
        headline={briefing.headline}
        message={briefing.message}
        tag={briefing.tag}
        goalBadge={goalBadge}
        calorieSummary={calorieSummary}
      />

      <MealSuggestions
        date={today}
        target={target}
        consumed={consumed}
        favorites={favorites}
        hasMealRecords={records.length > 0}
        showCoachBanner={false}
      />

      <div className="dashboard-bento">
        <section className="dashboard-card" aria-labelledby="dashboard-weekly-heading">
          <div className="dashboard-card-head">
            <div className="dashboard-card-title">
              <ChartBarIcon size={18} />
              <h2 id="dashboard-weekly-heading">최근 7일 칼로리 추이</h2>
            </div>
            <Link href="/meals/stats?days=7" className="text-link inline-icon-link">
              <span>통계 전체 보기</span>
              <ArrowUpRightIcon size={14} />
            </Link>
          </div>

          <dl className="dashboard-mini-kpis">
            <div>
              <dt>기록한 날</dt>
              <dd>{recordedCount7} / 7일</dd>
            </div>
            <div>
              <dt>7일 평균</dt>
              <dd>{recordedCount7 > 0 ? `${format(avgCalories7)} kcal` : "—"}</dd>
            </div>
            <div>
              <dt>목표 칼로리</dt>
              <dd>{target ? `${format(target.calories)} kcal` : "미설정"}</dd>
            </div>
          </dl>

          {recordedCount7 > 0 ? (
            <div className="dashboard-mini-chart-wrap">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="dashboard-mini-svg"
                role="img"
                aria-label="최근 7일 일별 칼로리 섭취량 미니 그래프"
              >
                <defs>
                  <linearGradient id="dash-bar-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.48" />
                  </linearGradient>
                  <linearGradient id="dash-bar-today-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#174630" />
                    <stop offset="100%" stopColor="#2c7a51" />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map((ratio) => {
                  const y = pad.top + plotH * (1 - ratio);
                  return (
                    <g key={ratio}>
                      <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} className="stats-gridline" />
                      <text x={pad.left - 8} y={y + 4} textAnchor="end" className="stats-axis-text">
                        {format(chartCeiling * ratio)}
                      </text>
                    </g>
                  );
                })}
                {target && targetLineY !== null ? (
                  <g>
                    <line
                      x1={pad.left}
                      y1={targetLineY}
                      x2={svgW - pad.right}
                      y2={targetLineY}
                      className="stats-target-line"
                    />
                    <text
                      x={svgW - pad.right}
                      y={Math.max(13, targetLineY - 6)}
                      textAnchor="end"
                      className="stats-target-label"
                    >
                      목표 {format(target.calories)}
                    </text>
                  </g>
                ) : null}
                {statsBundle.entries.map((entry, idx) => {
                  const cal = entry.nutrients?.calories ?? null;
                  const barH = cal !== null ? Math.max(cal > 0 ? 4 : 2, (cal / chartCeiling) * plotH) : 0;
                  const x = pad.left + idx * slotW + (slotW - barW) / 2;
                  const y = pad.top + plotH - barH;
                  const isToday = entry.date === today;
                  return (
                    <Link
                      key={entry.date}
                      href={`/meals?date=${entry.date}`}
                      aria-label={`${entry.date} ${cal !== null ? `${format(cal)} kcal` : "미기록"} 식단 보기`}
                    >
                      <g className={`dashboard-mini-bar-group${isToday ? " is-today" : ""}`}>
                        <rect
                          x={pad.left + idx * slotW + 2}
                          y={pad.top}
                          width={slotW - 4}
                          height={plotH}
                          rx={6}
                          className="stats-hit-bg"
                        />
                        {cal !== null ? (
                          <rect x={x} y={y} width={barW} height={barH} rx={5} className="dashboard-mini-bar" />
                        ) : (
                          <rect
                            x={x}
                            y={pad.top + plotH - 8}
                            width={barW}
                            height={8}
                            rx={3}
                            className="stats-svg-unrecorded"
                          />
                        )}
                        <text x={x + barW / 2} y={svgH - 18} textAnchor="middle" className="stats-axis-label">
                          {formatShortDate(entry.date)}
                        </text>
                        <text x={x + barW / 2} y={svgH - 4} textAnchor="middle" className="stats-axis-sub">
                          {isToday ? "오늘" : formatWeekday(entry.date)}
                        </text>
                      </g>
                    </Link>
                  );
                })}
              </svg>
              <p className="dashboard-chart-hint">날짜 막대를 누르면 해당 날짜의 식단 기록으로 바로 이동해요.</p>
            </div>
          ) : (
            <div className="dashboard-empty-mini">
              <p>최근 7일 동안 기록된 식단이 없습니다. 오늘 식사를 기록하면 추이 그래프가 그려집니다.</p>
              <Link href="/meals" className="secondary-button">
                첫 식단 기록하기
              </Link>
            </div>
          )}
        </section>

        <div className="dashboard-side-stack">
          <section className="dashboard-card" aria-labelledby="dashboard-meals-heading">
            <div className="dashboard-card-head">
              <div className="dashboard-card-title">
                <MealsIcon size={18} />
                <h2 id="dashboard-meals-heading">오늘 끼니별 현황</h2>
              </div>
              <span className="dashboard-muted-count">음식 {records.length}개</span>
            </div>
            <ul className="dashboard-meal-list" role="list">
              {statsBundle.dayBreakdown.map((item) => (
                <li key={item.mealType}>
                  <Link href={`/meals?date=${today}#meal-group-${item.mealType}`} className="dashboard-meal-item">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.count > 0 ? `${item.count}개 음식` : "미기록"}</span>
                    </div>
                    <span className="dashboard-meal-kcal">
                      {item.count > 0 ? `${format(item.nutrients.calories)} kcal` : "추가하기"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="dashboard-card" aria-labelledby="dashboard-goals-heading">
            <div className="dashboard-card-head">
              <div className="dashboard-card-title">
                <ScaleIcon size={18} />
                <h2 id="dashboard-goals-heading">내 대사량 · 목표 기준</h2>
              </div>
              <Link href="/goals" className="text-link inline-icon-link">
                <span>변경·이력</span>
                <ArrowUpRightIcon size={14} />
              </Link>
            </div>
            {condition && target ? (
              <dl className="dashboard-metabolic-dl">
                <div>
                  <dt>기초대사량 (BMR)</dt>
                  <dd>{bmr ? `${format(bmr)} kcal` : "—"}</dd>
                </div>
                <div>
                  <dt>일일 소비량 (TDEE)</dt>
                  <dd>{tdee ? `${format(tdee)} kcal` : "—"}</dd>
                </div>
                <div>
                  <dt>하루 목표 칼로리</dt>
                  <dd>{format(target.calories)} kcal</dd>
                </div>
                <div>
                  <dt>최근 저장 체중</dt>
                  <dd>{condition.weight} kg</dd>
                </div>
              </dl>
            ) : (
              <p className="dashboard-empty-text">
                아직 목표가 설정되지 않았습니다. <Link href="/goals" className="text-link">목표 설정</Link>에서 신체 정보를 입력해 주세요.
              </p>
            )}
            <div className="dashboard-card-foot">
              <span>저장한 내 음식 {favorites.length}개</span>
              <Link href="/foods" className="text-link inline-icon-link">
                <span>음식 검색·관리</span>
                <ArrowUpRightIcon size={14} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
