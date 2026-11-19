"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FoodFields, emptyFoodFields, type FoodFieldValues } from "@/components/FoodFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createFavoriteFoodAction } from "@/lib/mealActions";
import { foodUnits, nutrientFields } from "@/lib/mealNutrition";
import { foodSearchScopes, type FoodSearchResult, type FoodSearchScope, type PublicFood } from "@/lib/foodNutrition";

const initialResultCount = 3;

type FoodSearchRequest = { query: string; page: number; scope: FoodSearchScope };

// 검색과 저장은 별도 폼으로 두어 검색만으로 음식이 등록되거나 기존 입력이 제출되지 않게 합니다.
export function FoodRegistration({ searchAvailable, children }: { searchAvailable: boolean; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<FoodSearchScope>("all");
  const [fields, setFields] = useState<FoodFieldValues>(emptyFoodFields);
  const [result, setResult] = useState<(FoodSearchResult & FoodSearchRequest) | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showFullPage, setShowFullPage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [selection, setSelection] = useState("");
  const controller = useRef<AbortController | null>(null);
  const lastRequest = useRef<FoodSearchRequest | null>(null);
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

  async function search({ query: text, page, scope }: FoodSearchRequest) {
    const term = text.trim().replace(/\s+/g, " ");
    // 다음 페이지 조회가 실패해도 실패한 페이지와 범위로 다시 요청합니다.
    lastRequest.current = { query: term, page, scope };
    if (term.length < 1 || term.length > 40) {
      setError("음식명을 1~40자로 입력해주세요.");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setLoginRequired(false);
    try {
      const params = new URLSearchParams({ q: term, page: String(page), scope });
      const response = await fetch(`/api/foods/search?${params}`, { signal: request.signal });
      const data = await response.json().catch(() => null);
      if (request.signal.aborted) return;
      // 페이지 조회가 실패하면 이전 결과와 다시 시도할 수 있는 버튼을 남깁니다.
      if (!response.ok || !Array.isArray(data?.foods)) {
        setLoginRequired(response.status === 401);
        setError(typeof data?.error === "string" ? data.error : "검색 결과를 불러오지 못했습니다. 다시 검색해주세요.");
        return;
      }
      setResult({ ...(data as FoodSearchResult), query: term, scope });
      setShowFullPage(false);
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
    void search({ query, page: 1, scope });
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
    const guidance = missing ? "비어 있는 항목을 확인해 입력해주세요." : "기준량과 영양정보를 확인한 뒤 저장해주세요.";
    const basisNote = food.basis?.unit === "ml" ? ` 공공데이터에서 ${food.basis.amount} mL 부피 기준으로 제공됩니다.` : "";
    setSelection(`${food.name} 정보를 불러왔습니다.${basisNote} ${guidance}`);
    setShowResults(false);
  }

  const totalPages = result ? Math.min(100, Math.ceil(result.totalCount / result.pageSize)) : 0;
  // API 순서를 유지하고 한 페이지 안에서 필요한 만큼만 펼쳐 봅니다.
  const foods = result?.foods ?? [];
  const visibleFoods = showFullPage ? foods : foods.slice(0, initialResultCount);

  return (
    <>
      {searchAvailable ? (
        <section className="food-search" aria-labelledby="food-search-heading">
          <div className="section-heading food-search-heading">
            <h2 id="food-search-heading">공공 영양정보 검색</h2>
            <a className="text-link" href="#food-form-heading">직접 입력</a>
          </div>
          <form onSubmit={submitSearch} className="food-search-form" role="search" aria-labelledby="food-search-heading">
            <div className="field-group food-search-scope">
              <label htmlFor="public-food-scope">검색 범위</label>
              <select
                id="public-food-scope"
                value={scope}
                disabled={busy}
                onChange={(event) => {
                  const nextScope = event.target.value as FoodSearchScope;
                  setScope(nextScope);
                  // 검색 결과가 열려 있으면 새 범위의 첫 페이지로 이동합니다.
                  if (result) void search({ query: result.query, page: 1, scope: nextScope });
                }}
              >
                {Object.entries(foodSearchScopes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="public-food-query">음식명 또는 제품명</label>
              <input
                id="public-food-query"
                type="search"
                value={query}
                minLength={1}
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
                  setLoginRequired(false);
                }}
                required
              />
            </div>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "검색 중…" : "검색"}</button>
          </form>
          {busy ? <p className="food-search-feedback" role="status">음식 정보를 찾고 있습니다.</p> : null}
          {/* 오류가 발생하면 기존 검색어로 다시 시도하거나 로그인할 수 있습니다. */}
          {error ? (
            <div className="food-search-error" role="alert">
              <p className="field-error">{error}</p>
              {loginRequired ? <a href="/login?next=/foods" className="text-link">로그인하기</a> : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (lastRequest.current) void search(lastRequest.current);
                  }}
                  disabled={busy}
                >
                  다시 검색
                </button>
              )}
            </div>
          ) : null}
          {result ? (
            <div className="food-search-results-panel" aria-busy={busy}>
              <div className="section-heading food-search-heading">
                <h3 ref={resultsHeading} tabIndex={-1}>
                  “{result.query}” 검색 결과 <span>{foodSearchScopes[result.scope]}</span>
                </h3>
                {result.foods.length ? (
                  <button className="secondary-button" type="button" aria-expanded={showResults} aria-controls="public-food-results" disabled={busy} onClick={() => setShowResults(!showResults)}>
                    {showResults ? "결과 접기" : "결과 다시 보기"}
                  </button>
                ) : null}
              </div>
              <div id="public-food-results" hidden={!showResults}>
                {result.totalCount > result.pageSize ? (
                  <p className="food-search-help">결과가 많으면 ‘일반 음식’이나 ‘판매 제품’을 선택하거나 제품명을 더 구체적으로 입력해 보세요.</p>
                ) : null}
                {foods.length > initialResultCount ? (
                  <div className="food-search-preview-controls">
                    <p role="status">이 페이지 {foods.length}개 중 {visibleFoods.length}개 표시</p>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-expanded={showFullPage}
                      aria-controls="public-food-list"
                      disabled={busy}
                      onClick={() => setShowFullPage(!showFullPage)}
                    >
                      {showFullPage ? "처음 3개만 보기" : `${foods.length - initialResultCount}개 더 보기`}
                    </button>
                  </div>
                ) : null}
                {foods.length ? (
                  <ul id="public-food-list" className="food-search-results" role="list">
                    {visibleFoods.map((food, index) => (
                      <li key={`${food.code}-${index}`}>
                        <details>
                          <summary className="food-search-result-heading">
                            <span>
                              <strong>{food.name}</strong>
                              {food.maker ? <small>{food.maker}</small> : null}
                              <span className="food-search-basis">
                                {food.basis ? `${food.basis.amount} ${foodUnits[food.basis.unit]} ${food.basis.unit === "ml" ? "부피 기준" : "기준"}` : "기준량 미제공"}
                              </span>
                            </span>
                            <span className="food-search-details-label">영양정보</span>
                          </summary>
                          {/* 값이 제공되지 않은 영양소는 실제 0과 구분합니다. */}
                          <div className="food-search-result-details">
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
                              aria-label={`등록 폼에 적용 — ${food.name}${food.maker ? `, ${food.maker}` : ""}${food.basis ? `, ${food.basis.amount} ${foodUnits[food.basis.unit]} 기준` : ""}`}
                            >
                              등록 폼에 적용
                            </button>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="food-search-feedback">
                    {result.totalCount > 0
                      ? "이 페이지에는 맞는 기준 단위의 결과가 없어요. 다른 페이지를 확인하거나 직접 입력해 보세요."
                      : "검색 범위를 ‘전체’로 바꾸거나 다른 음식명으로 검색해 보세요."}
                  </p>
                )}
                {totalPages > 1 ? (
                  <nav className="food-search-pagination" aria-label="검색 결과 페이지">
                    <button className="secondary-button" type="button" disabled={busy || result.page <= 1} onClick={() => void search({ ...result, page: result.page - 1 })}>이전</button>
                    <span>{result.page} / {totalPages} 페이지</span>
                    <button className="secondary-button" type="button" disabled={busy || result.page >= totalPages} onClick={() => void search({ ...result, page: result.page + 1 })}>다음</button>
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
