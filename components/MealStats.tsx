import Link from "next/link";
import type { CSSProperties } from "react";
import { nutrientFields, type Nutrients } from "@/lib/mealNutrition";
import type { MealStatDays, MealStatEntry } from "@/lib/mealStats";

type Options = { stats: MealStatEntry[]; days: MealStatDays; metric: keyof Nutrients };

const numberFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

// 가장 큰 섭취량을 포함하는 눈금을 골라 날짜마다 같은 축으로 비교합니다.
function axisCeiling(maximum: number) {
  if (maximum < 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const leading = maximum / magnitude;
  const step = leading <= 1 ? 1 : leading <= 2 ? 2 : leading <= 5 ? 5 : 10;
  return step * magnitude;
}

export function MealStats({ stats, days, metric }: Options) {
  const { label, unit } = nutrientFields.find((field) => field.key === metric) ?? nutrientFields[0];
  const values = stats.filter((entry) => entry.nutrients !== null);
  const recorded = values.length;
  const total = values.reduce((sum, entry) => sum + (entry.nutrients?.[metric] ?? 0), 0);
  const highest = values.reduce((maximum, entry) => Math.max(maximum, entry.nutrients?.[metric] ?? 0), 0);
  const ceiling = axisCeiling(highest);
  const format = (value: number) => numberFormat.format(value);

  return (
    <section className="meal-stats" data-metric={metric} aria-label="날짜별 섭취 통계">
      {/* 주소로 기간과 영양 항목을 관리해 이동 후에도 선택이 남게 합니다. */}
      <div className="meal-stats-controls">
        <nav className="meal-stats-period" aria-label="통계 기간">
          {([7, 30] as const).map((period) => (
            <Link
              key={period}
              href={{ pathname: "/meals/stats", query: { days: period, metric } }}
              aria-current={days === period ? "page" : undefined}
            >
              최근 {period}일
            </Link>
          ))}
        </nav>
        <nav className="meal-stats-metrics" aria-label="섭취 항목">
          {nutrientFields.map((field) => (
            <Link
              key={field.key}
              href={{ pathname: "/meals/stats", query: { days, metric: field.key } }}
              aria-current={metric === field.key ? "page" : undefined}
            >
              {field.label}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="meal-stats-summary">
        <div><dt>기록한 날</dt><dd>{recorded} <span>/ {days}일</span></dd></div>
        <div><dt>기간 합계</dt><dd>{recorded ? format(total) : "—"} <span>{unit}</span></dd></div>
        <div><dt>기록한 날의 하루 평균</dt><dd>{recorded ? format(total / recorded) : "—"} <span>{unit}</span></dd></div>
      </dl>

      {recorded > 0 ? (
        <figure className="meal-stats-chart" aria-labelledby="meal-stats-chart-heading">
          <figcaption className="meal-stats-chart-header">
            <h2 id="meal-stats-chart-heading">일별 {label} 섭취량</h2>
            <span>{unit}</span>
          </figcaption>
          {/* 날짜별 링크에 값과 기록 여부를 붙여 막대나 색 없이도 내용을 읽을 수 있게 합니다. */}
          <div className="meal-stats-scroll" role="region" aria-label={`${label} 섭취량 그래프`} tabIndex={0}>
            <div className="meal-stats-plot">
              <div className="meal-stats-axis" aria-hidden="true">
                <span>{format(ceiling)}</span><span>{format(ceiling / 2)}</span><span>0</span>
              </div>
              <ol className="meal-stats-columns" data-days={days}>
                {stats.map(({ date, nutrients }) => {
                  const value = nutrients?.[metric];
                  const reading = value === undefined ? "미기록" : `${format(value)} ${unit}`;
                  const [year, month, day] = date.split("-").map(Number);
                  return (
                    <li key={date}>
                      <Link
                        className="meal-stats-column"
                        href={{ pathname: "/meals", query: { date } }}
                        prefetch={false}
                        aria-label={`${year}년 ${month}월 ${day}일 ${reading}, 식단 기록 보기`}
                        title={`${month}/${day} ${reading}`}
                        data-recorded={value !== undefined}
                        data-zero={value === 0 || undefined}
                      >
                        <span className="meal-stats-track" aria-hidden="true">
                          {value !== undefined ? (
                            <span className="meal-stats-bar" style={{ "--bar-height": `${value / ceiling * 100}%` } as CSSProperties} />
                          ) : null}
                        </span>
                        <time className="meal-stats-day" dateTime={date}>{month}/{day}</time>
                        <span className="meal-stats-reading" aria-hidden="true">{value === undefined ? "미기록" : format(value)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
          <p className="meal-stats-legend">날짜를 선택하면 해당 식단 기록을 볼 수 있어요.</p>
        </figure>
      ) : (
        <div className="meal-stats-empty">
          <p>이 기간에 기록한 식단이 없어요.</p>
          <Link href="/meals" className="primary-button">오늘 식단 기록하기</Link>
        </div>
      )}
    </section>
  );
}
