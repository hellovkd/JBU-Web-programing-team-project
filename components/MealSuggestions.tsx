"use client";

import Link from "next/link";
import { useState } from "react";
import { CoachBanner } from "@/components/CoachBear";
import { AlertTriangleIcon, CheckCircleIcon, PlusIcon, SearchIcon, SparklesIcon } from "@/components/Icons";
import { getMealsCoachMessage } from "@/lib/coachTips";
import type { SavedFavoriteFood } from "@/lib/favoriteFoods";
import { foodUnits, formatNumber as display, nutrientFields, type Nutrients } from "@/lib/mealNutrition";
import {
  analyzeNutrientGaps,
  getMealSuggestions,
  type MacroKey,
  type NutrientStatus,
} from "@/lib/mealSuggestions";

type Props = {
  date: string;
  target?: Nutrients;
  consumed: Nutrients;
  favorites: SavedFavoriteFood[];
  hasMealRecords: boolean;
  showCoachBanner?: boolean;
};

const STATUS_LABEL: Record<NutrientStatus, string> = {
  deficient: "부족",
  balanced: "적정",
  over: "초과",
};

export function MealSuggestions({
  date,
  target,
  consumed,
  favorites,
  hasMealRecords,
  showCoachBanner = true,
}: Props) {
  const hasTarget = Boolean(target && target.calories > 0);
  const gapPreview = hasTarget && target ? analyzeNutrientGaps(target, consumed) : undefined;
  const defaultFocus = gapPreview?.deficientMacros[0]?.key as MacroKey | undefined;

  const [selectedMacro, setSelectedMacro] = useState<MacroKey | undefined>(defaultFocus);
  const activeMacro =
    selectedMacro && gapPreview?.deficientMacros.some((item) => item.key === selectedMacro)
      ? selectedMacro
      : defaultFocus;

  const analysis =
    hasTarget && target ? getMealSuggestions(target, consumed, favorites, activeMacro) : undefined;

  const [tab, setTab] = useState<"favorites" | "guide">(
    analysis && analysis.suggestions.length > 0 ? "favorites" : "guide",
  );

  const priority = analysis?.priority;
  const suggestions = analysis?.suggestions ?? [];
  const guideFoods = analysis?.guideFoods ?? [];
  const deficientMacros = analysis?.deficientMacros ?? [];
  const currentTab = tab === "favorites" && suggestions.length === 0 && guideFoods.length > 0 ? "guide" : tab;

  const coachMessage = getMealsCoachMessage({
    hasTarget,
    hasMealRecords,
    priorityLabel: priority?.label,
    priorityRemaining: priority?.remaining ?? 0,
    priorityUnit: priority?.unit,
    remainingCalories: analysis?.remaining.calories ?? 0,
  });

  return (
    <section className="surface-panel meal-suggestions" aria-labelledby="meal-suggestions-heading">
      <header className="meal-suggestions-header">
        <div className="meal-suggestions-title-row">
          <SparklesIcon size={18} />
          <h2 id="meal-suggestions-heading">하루 섭취량 및 부족영양소 추천</h2>
        </div>
        {priority && analysis && analysis.remaining.calories > 15 ? (
          <p className={`meal-suggestions-focus ${priority.key}`}>
            우선 보충: <strong>{priority.label} {display(priority.remaining)} {priority.unit}</strong> 남음
          </p>
        ) : null}
      </header>

      {showCoachBanner ? (
        <CoachBanner
          badge={priority ? `${priority.label} 코칭` : hasTarget ? "영양 분석" : "목표 안내"}
          message={coachMessage}
          action={
            !hasTarget ? (
              <Link href="/goals" className="secondary-button">
                목표 설정하기
              </Link>
            ) : undefined
          }
        />
      ) : !hasTarget ? (
        <div className="meal-suggestions-cta-row">
          <p className="meal-suggestions-status">
            목표 설정에서 하루 목표를 저장하면 부족한 영양소와 맞춤 음식을 추천해드려요.
          </p>
          <Link href="/goals" className="secondary-button">목표 설정에서 하루 목표 계산하기</Link>
        </div>
      ) : null}

      <div className="nutrient-gap-grid" role="group" aria-label="하루 섭취량 및 영양소별 달성 상태">
        {analysis ? (
          analysis.gaps.map((gap) => {
            const isMacro = gap.key !== "calories";
            const isDeficientSelectable =
              isMacro && gap.status === "deficient" && analysis.remaining.calories > 15;
            const isSelected = activeMacro === gap.key;
            const StatusIcon = gap.status === "balanced" ? CheckCircleIcon : AlertTriangleIcon;

            const content = (
              <>
                <div className="nutrient-gap-top">
                  <span className="nutrient-gap-name">{gap.label}</span>
                  <span className={`status-badge status-${gap.status}`}>
                    <StatusIcon size={12} />
                    <span>{STATUS_LABEL[gap.status]}</span>
                  </span>
                </div>
                <p className="nutrient-gap-consumed">
                  <strong>{display(gap.consumed)}</strong>
                  <span>{gap.unit} 섭취</span>
                </p>
                <div className="nutrient-gap-figures">
                  <span>목표 {display(gap.target)} {gap.unit}</span>
                  <span>
                    {gap.remaining >= 0
                      ? `${display(gap.remaining)} ${gap.unit} 남음`
                      : `${display(Math.abs(gap.remaining))} ${gap.unit} 초과`}{" "}
                    ({gap.achievementRate}%)
                  </span>
                </div>
                <div
                  className="nutrient-gap-track"
                  role="progressbar"
                  aria-label={`${gap.label} 목표 대비 섭취량`}
                  aria-valuemin={0}
                  aria-valuemax={gap.target}
                  aria-valuenow={Math.min(gap.consumed, gap.target)}
                >
                  <span
                    className={gap.status === "over" ? "is-over" : undefined}
                    style={{ width: `${Math.min(100, gap.achievementRate)}%` }}
                  />
                </div>
                {isDeficientSelectable ? (
                  <span className="nutrient-gap-hint">
                    {isSelected ? "현재 추천 기준" : "눌러서 추천 음식 보기"}
                  </span>
                ) : null}
              </>
            );

            if (isDeficientSelectable) {
              return (
                <button
                  key={gap.key}
                  type="button"
                  className={`nutrient-gap-card ${gap.key} is-selectable${isSelected ? " is-selected" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedMacro(gap.key as MacroKey)}
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={gap.key} className={`nutrient-gap-card ${gap.key}`}>
                {content}
              </div>
            );
          })
        ) : (
          nutrientFields.map(({ key, label, unit }) => (
            <div key={key} className={`nutrient-gap-card ${key}`}>
              <div className="nutrient-gap-top">
                <span className="nutrient-gap-name">{label}</span>
                <span className="status-badge status-empty">목표 미설정</span>
              </div>
              <p className="nutrient-gap-consumed">
                <strong>{display(consumed[key])}</strong>
                <span>{unit} 섭취</span>
              </p>
              <div className="nutrient-gap-figures">
                <span>목표 미설정</span>
                <span>—</span>
              </div>
              <div className="nutrient-gap-track" aria-hidden="true" />
            </div>
          ))
        )}
      </div>

      {analysis && deficientMacros.length > 0 && analysis.remaining.calories > 15 ? (
        <div className="suggestion-panel">
          <div className="suggestion-toolbar">
            <div className="suggestion-tabs" role="tablist" aria-label="추천 음식 출처">
              <button
                type="button"
                role="tab"
                id="tab-favorites"
                aria-selected={currentTab === "favorites"}
                aria-controls="panel-favorites"
                className={currentTab === "favorites" ? "is-active" : undefined}
                onClick={() => setTab("favorites")}
              >
                내 음식 추천 ({suggestions.length})
              </button>
              <button
                type="button"
                role="tab"
                id="tab-guide"
                aria-selected={currentTab === "guide"}
                aria-controls="panel-guide"
                className={currentTab === "guide" ? "is-active" : undefined}
                onClick={() => setTab("guide")}
              >
                추천 음식 가이드 ({guideFoods.length})
              </button>
            </div>
            {priority ? (
              <p className="suggestion-toolbar-hint">
                부족한 <strong>{priority.label}</strong>을(를) 남은 열량({display(analysis.remaining.calories)} kcal) 안에서 채워요
              </p>
            ) : null}
          </div>

          {currentTab === "favorites" ? (
            <div id="panel-favorites" role="tabpanel" aria-labelledby="tab-favorites">
              {suggestions.length > 0 ? (
                <ul className="suggestion-grid" role="list">
                  {suggestions.map((entry) => {
                    const unit = foodUnits[entry.food.unit];
                    const amountLabel = `${display(entry.amount)} ${unit}`;
                    const href = {
                      pathname: "/meals",
                      query: { date, favorite: entry.food.id, amount: entry.amount },
                      hash: "meal-form-heading",
                    };
                    return (
                      <li key={entry.food.id} className="suggestion-card">
                        <div className="suggestion-card-head">
                          <h3>{entry.food.name}</h3>
                          <span className="suggestion-portion">{amountLabel}</span>
                        </div>
                        <p className={`suggestion-highlight ${priority?.key ?? "protein"}`}>
                          {priority?.label} +{display(entry.grams)} g · {display(entry.calories)} kcal
                        </p>
                        <p className="suggestion-macros">
                          탄 {display(entry.carbs)}g · 단 {display(entry.protein)}g · 지 {display(entry.fat)}g
                        </p>
                        <Link
                          href={href}
                          className="secondary-button suggestion-card-action"
                          aria-label={`${entry.food.name} ${amountLabel} 식단에 채우기`}
                        >
                          <PlusIcon size={14} />
                          <span>식단에 채우기</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="suggestion-empty">
                  <p>
                    {favorites.length === 0
                      ? "저장된 내 음식이 없어 오른쪽 ‘추천 음식 가이드’ 또는 내 음식 등록을 이용해보세요."
                      : "남은 열량·영양소 예산 안에 꼭 맞는 저장 음식이 없어요. 추천 음식 가이드를 확인해보세요."}
                  </p>
                  <div className="suggestion-empty-actions">
                    <Link href="/foods" className="secondary-button">내 음식 등록하기</Link>
                    {guideFoods.length > 0 ? (
                      <button type="button" className="text-link" onClick={() => setTab("guide")}>
                        추천 음식 가이드 보기
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div id="panel-guide" role="tabpanel" aria-labelledby="tab-guide">
              {guideFoods.length > 0 ? (
                <ul className="suggestion-grid" role="list">
                  {guideFoods.map((entry) => {
                    const unit = foodUnits[entry.item.unit];
                    const amountLabel = `${display(entry.amount)} ${unit}`;
                    return (
                      <li key={entry.item.id} className="suggestion-card is-guide">
                        <div className="suggestion-card-head">
                          <div>
                            <span className="suggestion-category">{entry.item.category}</span>
                            <h3>{entry.item.name}</h3>
                          </div>
                          <span className="suggestion-portion">권장 {amountLabel}</span>
                        </div>
                        <p className={`suggestion-highlight ${entry.item.focusMacro}`}>
                          {priority?.label} +{display(entry.grams)} g · {display(entry.calories)} kcal
                        </p>
                        <p className="suggestion-reason">{entry.item.reason}</p>
                        <p className="suggestion-macros">
                          탄 {display(entry.carbs)}g · 단 {display(entry.protein)}g · 지 {display(entry.fat)}g
                        </p>
                        <Link
                          href={{ pathname: "/foods", query: { q: entry.item.searchQuery } }}
                          className="secondary-button suggestion-card-action"
                        >
                          <SearchIcon size={14} />
                          <span>공공데이터에서 검색</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="suggestion-empty">
                  <p>남은 칼로리가 적어 추가 식사 대신 가볍게 마무리하는 편이 좋습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
