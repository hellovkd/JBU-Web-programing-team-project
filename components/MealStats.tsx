"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { CoachBanner } from "@/components/CoachBear";
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from "@/components/Icons";
import { NumberTicker } from "@/components/MagicPrimitives";
import { getStatsCoachComment } from "@/lib/coachTips";
import {
  axisCeiling,
  formatFullDate,
  formatNumber as format,
  formatShortDate,
  formatWeekday,
  mealTypes,
  nutrientFields,
  type Nutrients,
} from "@/lib/mealNutrition";
import type { MealStatDays, MealStatEntry, MealStatsBundle } from "@/lib/mealStats";

type Props = {
  bundle: MealStatsBundle;
  metric: keyof Nutrients;
  target?: Nutrients;
  today: string;
};

const PERIODS: readonly MealStatDays[] = [1, 7, 30];

type DayStatus = {
  code: "empty" | "deficient" | "balanced" | "over";
  label: string;
};

function evaluateStatus(value: number | null, goal: number | undefined, key: keyof Nutrients): DayStatus {
  if (value === null) return { code: "empty", label: "미기록" };
  if (!goal || goal <= 0) return { code: "balanced", label: "기록됨" };
  const overRatio = key === "calories" ? 1.1 : 1.15;
  if (value > goal * overRatio) return { code: "over", label: "초과" };
  if (value < goal * 0.85) return { code: "deficient", label: "부족" };
  return { code: "balanced", label: "달성" };
}

function buildSvgAreaAndLine(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (!points.length) return { linePath: "", areaPath: "" };
  const linePath = points.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  if (points.length === 1) return { linePath, areaPath: "" };
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
  return { linePath, areaPath };
}

export function MealStats({ bundle, metric, target, today }: Props) {
  const { days, anchorDate, startDate, entries, dayRecords, dayBreakdown } = bundle;
  const activeField = nutrientFields.find((field) => field.key === metric) ?? nutrientFields[0];
  const { label, unit } = activeField;
  const targetValue = target?.[metric];

  const recordedEntries = entries.filter((entry) => entry.nutrients !== null);
  const recordedCount = recordedEntries.length;
  const total = recordedEntries.reduce((sum, entry) => sum + (entry.nutrients?.[metric] ?? 0), 0);
  const average = recordedCount > 0 ? total / recordedCount : 0;
  const highestEntry = recordedEntries.reduce<MealStatEntry | null>(
    (best, entry) =>
      !best || (entry.nutrients?.[metric] ?? 0) > (best.nutrients?.[metric] ?? 0) ? entry : best,
    null,
  );
  const highestValue = highestEntry?.nutrients?.[metric] ?? 0;

  const latestRecorded = [...recordedEntries].reverse()[0] ?? entries[entries.length - 1];
  const [selectedDate, setSelectedDate] = useState<string>(latestRecorded?.date ?? anchorDate);
  const activeEntry =
    entries.find((entry) => entry.date === selectedDate) ?? latestRecorded ?? entries[entries.length - 1];

  const highestMeal =
    [...dayBreakdown].sort((a, b) => b.nutrients[metric] - a.nutrients[metric])[0]?.mealType ?? "breakfast";
  const [selectedMealType, setSelectedMealType] = useState<keyof typeof mealTypes>(highestMeal);
  const activeMeal =
    dayBreakdown.find((item) => item.mealType === selectedMealType) ?? dayBreakdown[0];

  const [tableFilter, setTableFilter] = useState<"all" | "recorded">("all");

  // 1일 모드 요약 값
  const dayEntry = entries[0];
  const dayNutrients = dayEntry?.nutrients;
  const dayMetricVal = dayNutrients ? dayNutrients[metric] : null;
  const dayStatus = evaluateStatus(dayMetricVal, targetValue, metric);
  const dayTargetRate =
    dayMetricVal !== null && targetValue && targetValue > 0
      ? Math.round((dayMetricVal / targetValue) * 100)
      : null;

  const macroCalTotal = dayNutrients
    ? dayNutrients.carbs * 4 + dayNutrients.protein * 4 + dayNutrients.fat * 9
    : 0;
  const macroRatio =
    macroCalTotal > 0 && dayNutrients
      ? {
          carbs: Math.round((dayNutrients.carbs * 4 / macroCalTotal) * 100),
          protein: Math.round((dayNutrients.protein * 4 / macroCalTotal) * 100),
          fat: Math.round((dayNutrients.fat * 9 / macroCalTotal) * 100),
        }
      : null;
  const dayTotalCalories = dayNutrients?.calories ?? 0;

  // 차트 축 상한
  const chartMax =
    days === 1
      ? Math.max(
          ...dayBreakdown.map((item) => item.nutrients[metric]),
          targetValue ? targetValue / 2 : 0,
        )
      : Math.max(highestValue, targetValue ?? 0);
  const ceiling = axisCeiling(chartMax);

  // 30일 주차별 평균 계산
  const weeklySummaries =
    days === 30
      ? [
          entries.slice(0, 7),
          entries.slice(7, 14),
          entries.slice(14, 21),
          entries.slice(21, 30),
        ].map((chunk, idx) => {
          const logged = chunk.filter((item) => item.nutrients !== null);
          const sum = logged.reduce((acc, item) => acc + (item.nutrients?.[metric] ?? 0), 0);
          return {
            title: `${idx + 1}주차 (${formatShortDate(chunk[0].date)}~${formatShortDate(chunk[chunk.length - 1].date)})`,
            recordedDays: logged.length,
            totalDays: chunk.length,
            avg: logged.length > 0 ? sum / logged.length : null,
          };
        })
      : [];

  const tableRows = [...entries]
    .reverse()
    .filter((entry) => (tableFilter === "recorded" ? entry.nutrients !== null : true));

  const coachComment = getStatsCoachComment({
    days,
    metricLabel: label,
    unit,
    recordedCount,
    average: days === 1 ? (dayMetricVal ?? 0) : average,
    targetValue,
  });

  const handleKeyActivate = (event: KeyboardEvent<SVGGElement>, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <section className="meal-stats" data-metric={metric} aria-label="날짜별 기록 및 그래프 통계">
      {/* 기간(1일·7일·30일)과 영양 항목 선택 바 */}
      <div className="stats-toolbar">
        <nav className="stats-segmented" aria-label="통계 기간">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={{ pathname: "/meals/stats", query: { days: period, metric, date: anchorDate } }}
              aria-current={days === period ? "page" : undefined}
              className={days === period ? "stats-seg-item is-active" : "stats-seg-item"}
            >
              {period}일
            </Link>
          ))}
        </nav>

        <nav className="stats-segmented stats-metric-nav" aria-label="영양 항목">
          {nutrientFields.map((field) => (
            <Link
              key={field.key}
              href={{ pathname: "/meals/stats", query: { days, metric: field.key, date: anchorDate } }}
              aria-current={metric === field.key ? "page" : undefined}
              className={metric === field.key ? `stats-seg-item is-active ${field.key}` : `stats-seg-item ${field.key}`}
            >
              <span className="stats-metric-dot" aria-hidden="true" />
              <span>{field.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* 핵심 KPI 카드 */}
      {days === 1 ? (
        <dl className="stats-kpi-grid">
          <div className="stats-kpi-card">
            <dt>{formatShortDate(anchorDate)} {label}</dt>
            <dd>
              {dayMetricVal !== null ? (
                <NumberTicker value={dayMetricVal} decimalPlaces={metric === "calories" ? 0 : 1} />
              ) : (
                "—"
              )}{" "}
              <span>{unit}</span>
            </dd>
            <p>{dayMetricVal !== null ? formatFullDate(anchorDate) : "기록된 식단이 없습니다"}</p>
          </div>
          <div className="stats-kpi-card">
            <dt>목표 대비</dt>
            <dd>
              {dayTargetRate !== null ? (
                <>
                  <NumberTicker value={dayTargetRate} />%
                </>
              ) : (
                "—"
              )}
              {dayMetricVal !== null && targetValue ? (
                <span className={`status-badge status-${dayStatus.code}`}>{dayStatus.label}</span>
              ) : null}
            </dd>
            <p>{targetValue ? `목표 ${format(targetValue)} ${unit}` : "목표 설정에서 하루 목표를 계산하세요"}</p>
          </div>
          <div className="stats-kpi-card">
            <dt>기록한 음식</dt>
            <dd>
              <NumberTicker value={dayRecords.length} /> <span>개</span>
            </dd>
            <p>{dayBreakdown.filter((item) => item.count > 0).length}개 끼니에 분산 기록</p>
          </div>
          <div className="stats-kpi-card">
            <dt>탄단지 열량 비율</dt>
            <dd className="stats-kpi-ratio">
              {macroRatio ? `${macroRatio.carbs} : ${macroRatio.protein} : ${macroRatio.fat}` : "—"}
            </dd>
            <p>탄수화물 · 단백질 · 지방 (%)</p>
          </div>
        </dl>
      ) : (
        <dl className="stats-kpi-grid">
          <div className="stats-kpi-card">
            <dt>기록한 날</dt>
            <dd>
              <NumberTicker value={recordedCount} /> <span>/ {days}일</span>
            </dd>
            <p>{formatShortDate(startDate)} ~ {formatShortDate(anchorDate)}</p>
          </div>
          <div className="stats-kpi-card">
            <dt>기록일 하루 평균</dt>
            <dd>
              {recordedCount > 0 ? (
                <NumberTicker value={average} decimalPlaces={metric === "calories" ? 0 : 1} />
              ) : (
                "—"
              )}{" "}
              <span>{unit}</span>
            </dd>
            <p>
              {targetValue && recordedCount > 0
                ? `목표 대비 ${Math.round((average / targetValue) * 100)}%`
                : `항목: ${label}`}
            </p>
          </div>
          <div className="stats-kpi-card">
            <dt>기간 합계</dt>
            <dd>
              {recordedCount > 0 ? (
                <NumberTicker value={total} decimalPlaces={metric === "calories" ? 0 : 1} />
              ) : (
                "—"
              )}{" "}
              <span>{unit}</span>
            </dd>
            <p>최근 {days}일간 기록 합산</p>
          </div>
          <div className="stats-kpi-card">
            <dt>최고 섭취일</dt>
            <dd>
              {highestEntry && recordedCount > 0 ? (
                <NumberTicker value={highestValue} decimalPlaces={metric === "calories" ? 0 : 1} />
              ) : (
                "—"
              )}{" "}
              <span>{unit}</span>
            </dd>
            <p>
              {highestEntry && recordedCount > 0
                ? `${formatFullDate(highestEntry.date)}`
                : "기록이 쌓이면 표시됩니다"}
            </p>
          </div>
        </dl>
      )}

      {/* 곰 코치 통계 코멘트 */}
      <CoachBanner badge={`${days}일 분석`} message={coachComment} />

      {/* 기간별 그래프 섹션 */}
      {days === 1 ? (
        dayRecords.length > 0 && dayNutrients ? (
          <div className="stats-day-layout">
            <figure className="stats-chart-card" aria-labelledby="day-meal-chart-title">
              <figcaption className="stats-chart-header">
                <div>
                  <h2 id="day-meal-chart-title">끼니별 {label} 분포</h2>
                  <p>{formatFullDate(anchorDate)} · 막대를 클릭하거나 선택하면 상세 수치를 볼 수 있어요</p>
                </div>
                <span className="stats-chart-unit">단위: {unit}</span>
              </figcaption>

              {(() => {
                const svgW = 520;
                const svgH = 230;
                const pad = { top: 26, right: 20, bottom: 44, left: 48 };
                const plotW = svgW - pad.left - pad.right;
                const plotH = svgH - pad.top - pad.bottom;
                const slotW = plotW / dayBreakdown.length;
                const barW = Math.min(54, slotW * 0.56);

                return (
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="stats-svg"
                    role="img"
                    aria-label={`${formatFullDate(anchorDate)} 끼니별 ${label} 막대 그래프`}
                  >
                    {[0, 0.5, 1].map((ratio) => {
                      const y = pad.top + plotH * (1 - ratio);
                      const tickVal = ceiling * ratio;
                      return (
                        <g key={ratio}>
                          <line
                            x1={pad.left}
                            y1={y}
                            x2={svgW - pad.right}
                            y2={y}
                            className="stats-gridline"
                          />
                          <text x={pad.left - 8} y={y + 4} textAnchor="end" className="stats-axis-text">
                            {format(tickVal)}
                          </text>
                        </g>
                      );
                    })}

                    {dayBreakdown.map((item, idx) => {
                      const value = item.nutrients[metric];
                      const barH = Math.max(value > 0 ? 4 : 0, (value / ceiling) * plotH);
                      const x = pad.left + idx * slotW + (slotW - barW) / 2;
                      const y = pad.top + plotH - barH;
                      const isActive = activeMeal?.mealType === item.mealType;

                      return (
                        <g
                          key={item.mealType}
                          role="button"
                          tabIndex={0}
                          className={`stats-svg-bar-group${isActive ? " is-active" : ""}`}
                          aria-label={`${item.label} ${format(value)} ${unit}, 음식 ${item.count}개`}
                          onClick={() => setSelectedMealType(item.mealType)}
                          onMouseEnter={() => setSelectedMealType(item.mealType)}
                          onFocus={() => setSelectedMealType(item.mealType)}
                          onKeyDown={(e) => handleKeyActivate(e, () => setSelectedMealType(item.mealType))}
                        >
                          <rect
                            x={pad.left + idx * slotW + 4}
                            y={pad.top}
                            width={slotW - 8}
                            height={plotH}
                            rx={8}
                            className="stats-hit-bg"
                          />
                          {value > 0 ? (
                            <rect
                              x={x}
                              y={y}
                              width={barW}
                              height={barH}
                              rx={6}
                              className="stats-svg-bar"
                            />
                          ) : (
                            <rect
                              x={x}
                              y={pad.top + plotH - 4}
                              width={barW}
                              height={4}
                              rx={2}
                              className="stats-svg-empty-bar"
                            />
                          )}
                          <text
                            x={x + barW / 2}
                            y={value > 0 ? Math.max(14, y - 6) : pad.top + plotH - 10}
                            textAnchor="middle"
                            className="stats-bar-value"
                          >
                            {value > 0 ? format(value) : "0"}
                          </text>
                          <text x={x + barW / 2} y={svgH - 20} textAnchor="middle" className="stats-axis-label">
                            {item.label}
                          </text>
                          <text x={x + barW / 2} y={svgH - 5} textAnchor="middle" className="stats-axis-sub">
                            {item.count}개
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}

              {activeMeal ? (
                <div className="stats-meal-readout" aria-live="polite">
                  <strong>{activeMeal.label} ({activeMeal.count}개)</strong>
                  <span>
                    {format(activeMeal.nutrients.calories)} kcal · 탄 {format(activeMeal.nutrients.carbs)}g · 단{" "}
                    {format(activeMeal.nutrients.protein)}g · 지 {format(activeMeal.nutrients.fat)}g
                  </span>
                </div>
              ) : null}
            </figure>

            <section className="stats-chart-card" aria-labelledby="day-macro-split-title">
              <div className="stats-chart-header">
                <div>
                  <h2 id="day-macro-split-title">탄단지 열량 비율 및 끼니별 비중</h2>
                  <p>에너지 구성 비율과 각 끼니가 차지하는 칼로리 비중을 보여줍니다</p>
                </div>
              </div>

              {macroRatio ? (
                <div className="stats-macro-split is-top">
                  <div className="stats-macro-split-head">
                    <h3>탄수화물 · 단백질 · 지방 열량 비중</h3>
                    <span>총 {format(macroCalTotal)} kcal 기준</span>
                  </div>
                  <div
                    className="stats-macro-stack"
                    aria-label={`탄수화물 ${macroRatio.carbs}%, 단백질 ${macroRatio.protein}%, 지방 ${macroRatio.fat}%`}
                  >
                    <span className="carbs" style={{ width: `${macroRatio.carbs}%` }} />
                    <span className="protein" style={{ width: `${macroRatio.protein}%` }} />
                    <span className="fat" style={{ width: `${macroRatio.fat}%` }} />
                  </div>
                  <div className="stats-macro-legend">
                    <span className="carbs">
                      <i aria-hidden="true" /> 탄수화물 {macroRatio.carbs}% ({format(dayNutrients.carbs)}g)
                    </span>
                    <span className="protein">
                      <i aria-hidden="true" /> 단백질 {macroRatio.protein}% ({format(dayNutrients.protein)}g)
                    </span>
                    <span className="fat">
                      <i aria-hidden="true" /> 지방 {macroRatio.fat}% ({format(dayNutrients.fat)}g)
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="stats-meal-share-block">
                <div className="stats-macro-split-head">
                  <h3>끼니별 칼로리 비중</h3>
                  <span>{format(dayTotalCalories)} kcal</span>
                </div>
                <ul className="stats-meal-share-list" role="list">
                  {dayBreakdown.map((item) => {
                    const sharePct =
                      dayTotalCalories > 0
                        ? Math.round((item.nutrients.calories / dayTotalCalories) * 100)
                        : 0;
                    return (
                      <li key={item.mealType} className="stats-meal-share-row">
                        <div className="stats-meal-share-meta">
                          <strong>{item.label}</strong>
                          <span>
                            {format(item.nutrients.calories)} kcal ({sharePct}%)
                          </span>
                        </div>
                        <div className="stats-meal-share-track" aria-hidden="true">
                          <span style={{ width: `${sharePct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="stats-day-action-row">
                <Link href={`/meals?date=${anchorDate}`} className="secondary-button inline-icon-link">
                  <span>이 날짜 식단 기록·수정하기</span>
                  <ArrowUpRightIcon size={14} />
                </Link>
              </div>
            </section>
          </div>
        ) : (
          <div className="stats-empty-card">
            <ChartBarIcon size={24} />
            <h2>{formatFullDate(anchorDate)}에 기록된 식단이 없어요</h2>
            <p>식단을 기록하면 끼니별 분포 그래프와 탄단지 열량 비율을 바로 확인할 수 있습니다.</p>
            <Link href={`/meals?date=${anchorDate}`} className="primary-button">
              이 날 식단 기록하기
            </Link>
          </div>
        )
      ) : recordedCount > 0 ? (
        <figure className="stats-chart-card" aria-labelledby="period-chart-heading">
          <figcaption className="stats-chart-header">
            <div>
              <h2 id="period-chart-heading">
                최근 {days}일 일별 {label} 추이
              </h2>
              <p>
                {formatShortDate(startDate)} ~ {formatShortDate(anchorDate)} · 그래프의 날짜를 누르거나 선택하면 상세 수치로 이동해요
              </p>
            </div>
            <div className="stats-chart-legend-inline">
              {targetValue ? (
                <span className="stats-target-chip">
                  <i aria-hidden="true" /> 목표선 {format(targetValue)} {unit}
                </span>
              ) : null}
              <span className="stats-chart-unit">단위: {unit}</span>
            </div>
          </figcaption>

          {/* 선택한 날짜 인스펙터 바 */}
          {activeEntry ? (
            <div className="stats-inspector" aria-live="polite">
              <div className="stats-inspector-main">
                <div className="stats-inspector-date">
                  <CalendarIcon size={15} />
                  <strong>{formatFullDate(activeEntry.date)}</strong>
                  {activeEntry.date === today ? <span className="stats-today-pill">오늘</span> : null}
                  {(() => {
                    const st = evaluateStatus(activeEntry.nutrients?.[metric] ?? null, targetValue, metric);
                    const Icon = st.code === "balanced" ? CheckCircleIcon : AlertTriangleIcon;
                    return (
                      <span className={`status-badge status-${st.code}`}>
                        {st.code !== "empty" ? <Icon size={12} /> : null}
                        <span>{st.label}</span>
                      </span>
                    );
                  })()}
                </div>
                {activeEntry.nutrients ? (
                  <p className="stats-inspector-values">
                    <span>칼로리 <strong>{format(activeEntry.nutrients.calories)}</strong> kcal</span>
                    <span>탄수화물 <strong>{format(activeEntry.nutrients.carbs)}</strong> g</span>
                    <span>단백질 <strong>{format(activeEntry.nutrients.protein)}</strong> g</span>
                    <span>지방 <strong>{format(activeEntry.nutrients.fat)}</strong> g</span>
                    <span className="stats-inspector-count">({activeEntry.count}개 음식)</span>
                  </p>
                ) : (
                  <p className="stats-inspector-values">이 날짜에는 기록된 식단이 없습니다.</p>
                )}
              </div>
              <div className="stats-inspector-actions">
                <Link href={`/meals?date=${activeEntry.date}`} className="secondary-button">
                  기록 보기
                </Link>
                <Link
                  href={`/meals/stats?days=1&metric=${metric}&date=${activeEntry.date}`}
                  className="text-link"
                >
                  1일 그래프
                </Link>
              </div>
            </div>
          ) : null}

          {days === 7 ? (
            (() => {
              const svgW = 960;
              const svgH = 260;
              const pad = { top: 30, right: 24, bottom: 48, left: 56 };
              const plotW = svgW - pad.left - pad.right;
              const plotH = svgH - pad.top - pad.bottom;
              const slotW = plotW / entries.length;
              const barW = Math.min(54, slotW * 0.44);
              const targetY =
                targetValue && targetValue > 0 ? pad.top + plotH * (1 - targetValue / ceiling) : null;

              return (
                <div className="stats-svg-scroll">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="stats-svg"
                    role="img"
                    aria-label={`최근 7일 일별 ${label} 막대 그래프`}
                  >
                    {[0, 0.5, 1].map((ratio) => {
                      const y = pad.top + plotH * (1 - ratio);
                      return (
                        <g key={ratio}>
                          <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} className="stats-gridline" />
                          <text x={pad.left - 10} y={y + 4} textAnchor="end" className="stats-axis-text">
                            {format(ceiling * ratio)}
                          </text>
                        </g>
                      );
                    })}

                    {targetY !== null ? (
                      <g>
                        <line
                          x1={pad.left}
                          y1={targetY}
                          x2={svgW - pad.right}
                          y2={targetY}
                          className="stats-target-line"
                        />
                        <text x={svgW - pad.right} y={Math.max(12, targetY - 6)} textAnchor="end" className="stats-target-label">
                          목표 {format(targetValue!)} {unit}
                        </text>
                      </g>
                    ) : null}

                    {entries.map((entry, idx) => {
                      const val = entry.nutrients?.[metric] ?? null;
                      const barH = val !== null ? Math.max(val > 0 ? 4 : 2, (val / ceiling) * plotH) : 0;
                      const x = pad.left + idx * slotW + (slotW - barW) / 2;
                      const y = pad.top + plotH - barH;
                      const isActive = activeEntry?.date === entry.date;

                      return (
                        <g
                          key={entry.date}
                          role="button"
                          tabIndex={0}
                          className={`stats-svg-bar-group${isActive ? " is-active" : ""}`}
                          aria-label={`${formatFullDate(entry.date)} ${val !== null ? `${format(val)} ${unit}` : "미기록"}`}
                          onClick={() => setSelectedDate(entry.date)}
                          onMouseEnter={() => setSelectedDate(entry.date)}
                          onFocus={() => setSelectedDate(entry.date)}
                          onKeyDown={(e) => handleKeyActivate(e, () => setSelectedDate(entry.date))}
                        >
                          <rect
                            x={pad.left + idx * slotW + 4}
                            y={pad.top}
                            width={slotW - 8}
                            height={plotH}
                            rx={8}
                            className="stats-hit-bg"
                          />
                          {val !== null ? (
                            <>
                              <rect x={x} y={y} width={barW} height={barH} rx={6} className="stats-svg-bar" />
                              <text
                                x={x + barW / 2}
                                y={Math.max(16, y - 6)}
                                textAnchor="middle"
                                className="stats-bar-value"
                              >
                                {format(val)}
                              </text>
                            </>
                          ) : (
                            <rect
                              x={x}
                              y={pad.top + plotH - 12}
                              width={barW}
                              height={12}
                              rx={4}
                              className="stats-svg-unrecorded"
                            />
                          )}
                          <text x={x + barW / 2} y={svgH - 22} textAnchor="middle" className="stats-axis-label">
                            {formatShortDate(entry.date)}
                          </text>
                          <text x={x + barW / 2} y={svgH - 6} textAnchor="middle" className="stats-axis-sub">
                            ({formatWeekday(entry.date)})
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()
          ) : (
            (() => {
              const svgW = 960;
              const svgH = 270;
              const pad = { top: 30, right: 24, bottom: 46, left: 56 };
              const plotW = svgW - pad.left - pad.right;
              const plotH = svgH - pad.top - pad.bottom;
              const slotW = plotW / entries.length;
              const baselineY = pad.top + plotH;
              const targetY =
                targetValue && targetValue > 0 ? pad.top + plotH * (1 - targetValue / ceiling) : null;

              const pointList = entries
                .map((entry, idx) => {
                  const val = entry.nutrients?.[metric];
                  if (val === undefined || val === null) return null;
                  return {
                    date: entry.date,
                    val,
                    x: pad.left + idx * slotW + slotW / 2,
                    y: pad.top + plotH * (1 - val / ceiling),
                  };
                })
                .filter((pt): pt is { date: string; val: number; x: number; y: number } => pt !== null);

              const { linePath, areaPath } = buildSvgAreaAndLine(pointList, baselineY);
              const labelIndices = new Set([0, 5, 10, 15, 20, 25, entries.length - 1]);

              return (
                <div className="stats-svg-scroll">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="stats-svg"
                    role="img"
                    aria-label={`최근 30일 일별 ${label} 추이 그래프`}
                  >
                    <defs>
                      <linearGradient id="stats-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--stat-accent)" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="var(--stat-accent)" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[0, 0.5, 1].map((ratio) => {
                      const y = pad.top + plotH * (1 - ratio);
                      return (
                        <g key={ratio}>
                          <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} className="stats-gridline" />
                          <text x={pad.left - 10} y={y + 4} textAnchor="end" className="stats-axis-text">
                            {format(ceiling * ratio)}
                          </text>
                        </g>
                      );
                    })}

                    {targetY !== null ? (
                      <g>
                        <line
                          x1={pad.left}
                          y1={targetY}
                          x2={svgW - pad.right}
                          y2={targetY}
                          className="stats-target-line"
                        />
                        <text x={svgW - pad.right} y={Math.max(12, targetY - 6)} textAnchor="end" className="stats-target-label">
                          목표 {format(targetValue!)} {unit}
                        </text>
                      </g>
                    ) : null}

                    {areaPath ? <path d={areaPath} className="stats-svg-area" /> : null}
                    {linePath ? <path d={linePath} className="stats-svg-line" /> : null}

                    {entries.map((entry, idx) => {
                      const xCenter = pad.left + idx * slotW + slotW / 2;
                      const val = entry.nutrients?.[metric] ?? null;
                      const yPoint = val !== null ? pad.top + plotH * (1 - val / ceiling) : null;
                      const isActive = activeEntry?.date === entry.date;

                      return (
                        <g
                          key={entry.date}
                          role="button"
                          tabIndex={0}
                          className={`stats-svg-point-group${isActive ? " is-active" : ""}`}
                          aria-label={`${formatFullDate(entry.date)} ${val !== null ? `${format(val)} ${unit}` : "미기록"}`}
                          onClick={() => setSelectedDate(entry.date)}
                          onMouseEnter={() => setSelectedDate(entry.date)}
                          onFocus={() => setSelectedDate(entry.date)}
                          onKeyDown={(e) => handleKeyActivate(e, () => setSelectedDate(entry.date))}
                        >
                          <rect
                            x={pad.left + idx * slotW}
                            y={pad.top}
                            width={slotW}
                            height={plotH}
                            className="stats-hit-strip"
                          />
                          {isActive ? (
                            <line
                              x1={xCenter}
                              y1={pad.top}
                              x2={xCenter}
                              y2={baselineY}
                              className="stats-active-guide"
                            />
                          ) : null}
                          {yPoint !== null ? (
                            <circle
                              cx={xCenter}
                              cy={yPoint}
                              r={isActive ? 6 : 3.75}
                              className="stats-svg-dot"
                            />
                          ) : (
                            <circle
                              cx={xCenter}
                              cy={baselineY}
                              r={isActive ? 4 : 2.25}
                              className="stats-svg-dot-empty"
                            />
                          )}
                          {labelIndices.has(idx) ? (
                            <text x={xCenter} y={svgH - 14} textAnchor="middle" className="stats-axis-label">
                              {formatShortDate(entry.date)}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()
          )}

          {weeklySummaries.length > 0 ? (
            <div className="stats-weekly-strip" aria-label="주차별 기록 평균">
              {weeklySummaries.map((week) => (
                <div key={week.title} className="stats-weekly-card">
                  <span>{week.title}</span>
                  <strong>{week.avg !== null ? `${format(week.avg)} ${unit}` : "기록 없음"}</strong>
                  <small>기록 {week.recordedDays} / {week.totalDays}일</small>
                </div>
              ))}
            </div>
          ) : null}
        </figure>
      ) : (
        <div className="stats-empty-card">
          <ChartBarIcon size={24} />
          <h2>최근 {days}일간 기록한 식단이 없어요</h2>
          <p>오늘 식단을 한 끼만 기록해도 날짜별 변화 그래프와 평균 통계가 생성됩니다.</p>
          <Link href={`/meals?date=${anchorDate}`} className="primary-button">
            식단 기록하러 가기
          </Link>
        </div>
      )}

      {/* 7일 · 30일 모드에서만 날짜별 기록 내역 표 제공 (1일 상세 식단은 식단 기록에서 확인) */}
      {days !== 1 ? (
        <section className="stats-records-section" aria-labelledby="stats-records-heading">
          <div className="section-heading stats-records-header">
            <div>
              <h2 id="stats-records-heading">날짜별 기록 내역</h2>
              <span>최근 {days}일 ({recordedCount}일 기록됨)</span>
            </div>
            <div className="stats-table-filter" role="group" aria-label="기록 필터">
              <button
                type="button"
                aria-pressed={tableFilter === "all"}
                className={tableFilter === "all" ? "is-active" : undefined}
                onClick={() => setTableFilter("all")}
              >
                전체 {days}일
              </button>
              <button
                type="button"
                aria-pressed={tableFilter === "recorded"}
                className={tableFilter === "recorded" ? "is-active" : undefined}
                onClick={() => setTableFilter("recorded")}
              >
                기록한 날만 ({recordedCount})
              </button>
            </div>
          </div>

          {tableRows.length > 0 ? (
            <div className="record-table-scroll" tabIndex={0} role="region" aria-label="날짜별 영양 섭취 기록 표">
              <table className="record-table stats-table">
                <thead>
                  <tr>
                    <th scope="col">날짜</th>
                    <th scope="col">음식</th>
                    <th scope="col">칼로리 (kcal)</th>
                    <th scope="col">탄수화물 (g)</th>
                    <th scope="col">단백질 (g)</th>
                    <th scope="col">지방 (g)</th>
                    <th scope="col">{label} 상태</th>
                    <th scope="col">바로가기</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((entry) => {
                    const status = evaluateStatus(entry.nutrients?.[metric] ?? null, targetValue, metric);
                    const isSelected = activeEntry?.date === entry.date;
                    return (
                      <tr
                        key={entry.date}
                        className={isSelected ? "is-selected-row" : undefined}
                        onClick={() => setSelectedDate(entry.date)}
                      >
                        <td>
                          <time dateTime={entry.date}>
                            {entry.date} ({formatWeekday(entry.date)})
                          </time>
                        </td>
                        <td>{entry.count > 0 ? `${entry.count}개` : "—"}</td>
                        <td>{entry.nutrients ? format(entry.nutrients.calories) : "—"}</td>
                        <td>{entry.nutrients ? format(entry.nutrients.carbs) : "—"}</td>
                        <td>{entry.nutrients ? format(entry.nutrients.protein) : "—"}</td>
                        <td>{entry.nutrients ? format(entry.nutrients.fat) : "—"}</td>
                        <td>
                          <span className={`status-badge status-${status.code}`}>{status.label}</span>
                        </td>
                        <td className="stats-table-actions">
                          <Link href={`/meals?date=${entry.date}`} className="text-link">
                            식단
                          </Link>
                          <Link
                            href={`/meals/stats?days=1&metric=${metric}&date=${entry.date}`}
                            className="text-link"
                          >
                            1일 그래프
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-message">표시할 기록이 없습니다. ‘전체 {days}일’을 선택하거나 식단을 기록해보세요.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
