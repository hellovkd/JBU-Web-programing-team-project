"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FoodFields, emptyFoodFields, type FoodFieldValues } from "@/components/FoodFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createFavoriteFoodAction } from "@/lib/mealActions";
import { foodUnits, nutrientFields } from "@/lib/mealNutrition";
import type { FoodSearchResult, PublicFood } from "@/lib/foodNutrition";

// 검색과 저장은 별도 폼으로 두어 검색만으로 음식이 등록되거나 기존 입력이 제출되지 않게 합니다.
export function FoodRegistration({ searchAvailable, children }: { searchAvailable: boolean; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<FoodFieldValues>(emptyFoodFields);
  const [result, setResult] = useState<FoodSearchResult | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState("");
  const controller = useRef<AbortController | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const focusForm = useRef(false);

  useEffect(() => () => controller.current?.abort(), []);

  // 결과가 그려진 뒤 목록 첫 줄로 이동해 검색과 페이지 전환 위치를 알려줍니다.
  useEffect(() => {
    if (showResults) resultsHeading.current?.focus();
  }, [result, showResults]);

  // 결과가 접히고 폼이 위로 이동한 뒤 입력 영역에 초점을 둡니다.
  useEffect(() => {
    if (focusForm.current) {
      focusForm.current = false;
      formHeading.current?.focus();
    }
  }, [fields]);

  async function search(text: string, page = 1) {
    const term = text.trim().replace(/\s+/g, " ");
    if (term.length < 2 || term.length > 40) {
      setError("음식명을 2~40자로 입력해주세요.");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: term, page: String(page) });
      const response = await fetch(`/api/foods/search?${params}`, { signal: request.signal });
      const data = await response.json().catch(() => null);
      if (request.signal.aborted) return;
      // 페이지 조회가 실패하면 이전 결과와 다시 시도할 수 있는 버튼을 남깁니다.
      if (!response.ok || !Array.isArray(data?.foods)) {
        setError(typeof data?.error === "string" ? data.error : "검색 결과를 불러오지 못했습니다. 다시 검색해주세요.");
        return;
      }
      setResult(data as FoodSearchResult);
      setSearchedQuery(term);
      setShowResults(true);
    } catch {
      if (!request.signal.aborted) {
        setError("연결을 확인한 뒤 다시 검색해주세요.");
      }
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }

  function select(food: PublicFood) {
    // 기준량이나 영양값이 빠진 항목은 빈 입력란으로 남겨 사용자가 확인한 뒤 저장하게 합니다.
    focusForm.current = true;
    setFields({
      name: food.name,
      baseAmount: String(food.basis?.amount ?? ""),
      unit: food.basis?.unit ?? "g",
      calories: String(food.nutrients.calories ?? ""),
      carbs: String(food.nutrients.carbs ?? ""),
      protein: String(food.nutrients.protein ?? ""),
      fat: String(food.nutrients.fat ?? ""),
    });
    const missing = !food.basis || Object.values(food.nutrients).some((value) => value === null);
    setSelection(`${food.name} 정보를 불러왔습니다. ${missing ? "비어 있는 항목을 확인해 입력해주세요." : "기준량과 영양정보를 확인한 뒤 저장해주세요."}`);
    setShowResults(false);
  }

  const totalPages = result ? Math.min(100, Math.ceil(result.totalCount / result.pageSize)) : 0;

  return (
    <>
      {searchAvailable ? (
        <section className="food-search" aria-labelledby="food-search-heading">
          <div className="section-heading food-search-heading">
            <h2 id="food-search-heading">공공 영양정보 검색</h2>
            <a className="text-link" href="#food-form-heading">직접 입력</a>
          </div>
          <form onSubmit={submitSearch} className="food-search-form" role="search" aria-labelledby="food-search-heading">
            <div className="field-group">
              <label htmlFor="public-food-query">음식명 또는 제품명</label>
              <input
                id="public-food-query"
                type="search"
                value={query}
                minLength={2}
                maxLength={40}
                placeholder="예: 현미밥, 닭가슴살"
                onChange={(event) => {
                  // 검색어를 바꾸면 이전 요청을 취소해 늦은 응답이 섞이지 않게 합니다.
                  controller.current?.abort();
                  setBusy(false);
                  setQuery(event.target.value);
                  setResult(null);
                  setShowResults(false);
                  setError("");
                }}
                required
              />
            </div>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "검색 중…" : "검색"}</button>
          </form>
          {busy ? <p className="food-search-feedback" role="status">음식 정보를 찾고 있습니다.</p> : null}
          {error ? <p className="food-search-feedback field-error" role="alert">{error}</p> : null}
          {result ? (
            <div className="food-search-results-panel" aria-busy={busy}>
              <div className="section-heading food-search-heading">
                <h3 ref={resultsHeading} tabIndex={-1}>
                  “{searchedQuery}” 검색 결과 <span>{result.totalCount.toLocaleString("ko-KR")}건</span>
                </h3>
                {result.foods.length ? (
                  <button className="secondary-button" type="button" aria-expanded={showResults} aria-controls="public-food-results" disabled={busy} onClick={() => setShowResults(!showResults)}>
                    {showResults ? "결과 접기" : "결과 다시 보기"}
                  </button>
                ) : null}
              </div>
              <div id="public-food-results" hidden={!showResults}>
                {result.foods.length ? (
                  <ul className="food-search-results" role="list">
                    {result.foods.map((food, index) => (
                      <li key={`${food.code}-${index}`}>
                        <div className="food-search-result-heading">
                          <h4>{food.name}</h4>
                          {food.maker ? <p>{food.maker}</p> : null}
                          <p className="food-search-basis">{food.basis ? `${food.basis.amount} ${foodUnits[food.basis.unit]} 기준` : "기준량 미제공"}</p>
                        </div>
                        {/* 값이 제공되지 않은 영양소는 실제 0과 구분합니다. */}
                        <dl className="food-search-nutrients">
                          {nutrientFields.map(({ key, label, unit }) => (
                            <div key={key} className={key}>
                              <dt>{label}</dt>
                              <dd>{food.nutrients[key] === null ? <small>미제공</small> : <>{food.nutrients[key]} <small>{unit}</small></>}</dd>
                            </div>
                          ))}
                        </dl>
                        <button
                          type="button"
                          className="secondary-button food-result-button"
                          disabled={busy}
                          onClick={() => select(food)}
                          aria-label={`등록 폼에 적용: ${food.name}${food.maker ? `, ${food.maker}` : ""}`}
                        >
                          등록 폼에 적용
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="food-search-feedback">더 짧은 음식명이나 제품명으로 검색하거나 직접 입력해 보세요.</p>}
                {totalPages > 1 ? (
                  <nav className="food-search-pagination" aria-label="검색 결과 페이지">
                    <button className="secondary-button" type="button" disabled={busy || result.page <= 1} onClick={() => void search(searchedQuery, result.page - 1)}>이전</button>
                    <span>{result.page} / {totalPages} 페이지</span>
                    <button className="secondary-button" type="button" disabled={busy || result.page >= totalPages} onClick={() => void search(searchedQuery, result.page + 1)}>다음</button>
                  </nav>
                ) : null}
              </div>
            </div>
          ) : null}
          <a className="food-search-source text-link" href="https://www.data.go.kr/data/15127578/openapi.do" target="_blank" rel="noopener noreferrer">출처: 식품의약품안전처 식품영양성분DB정보 (새 창)</a>
        </section>
      ) : <p className="notice info-notice">공공 영양정보 검색을 사용할 수 없습니다. 아래에서 직접 등록할 수 있어요.</p>}
      <div className="food-workspace">
        <section className="surface-panel food-form-panel" aria-labelledby="food-form-heading">
          <div className="panel-header"><h2 id="food-form-heading" tabIndex={-1} ref={formHeading}>음식 등록</h2></div>
          <div role="status" className="food-selection">
            {selection ? <p className="notice info-notice">{selection}</p> : null}
          </div>
          <form action={createFavoriteFoodAction} className="food-form">
            <FoodFields values={fields} onChange={setFields} />
            <SubmitButton label="음식 저장" />
          </form>
          <p className="food-save-note">식단 기록에 먹은 양을 추가하면 하루 섭취량에 반영됩니다.</p>
        </section>
        {children}
      </div>
    </>
  );
}
