"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FoodFields, emptyFoodFields, type FoodFieldValues } from "@/components/FoodFields";
import { ExternalLinkIcon, SearchIcon, TagIcon, XIcon } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { createFavoriteFoodAction } from "@/lib/mealActions";
import { foodUnits, nutrientFields } from "@/lib/mealNutrition";
import {
  foodSearchScopes,
  formatAppliedFoodName,
  normalizeBrandInfo,
  type FoodBrandsResult,
  type FoodSearchResult,
  type FoodSearchScope,
  type PublicFood,
  type PublicFoodBrand,
} from "@/lib/foodNutrition";

const INITIAL_RESULT_COUNT = 5;
const INITIAL_BRAND_COUNT = 10;

type FoodSearchRequest = {
  query: string;
  page: number;
  scope: FoodSearchScope;
  maker: string;
};

type SelectedBrand = {
  label: string;
  makerQuery: string;
  sampleNames?: string[];
};

const normalizeMatchText = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();

// 검색과 저장은 별도 폼으로 두어 검색만으로 음식이 등록되거나 기존 입력이 제출되지 않게 합니다.
export function FoodRegistration({
  searchAvailable,
  initialQuery = "",
  children,
}: {
  searchAvailable: boolean;
  initialQuery?: string;
  children: ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<FoodSearchScope>("all");
  const [fields, setFields] = useState<FoodFieldValues>(emptyFoodFields);
  const [result, setResult] = useState<(FoodSearchResult & FoodSearchRequest) | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showFullPage, setShowFullPage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [selection, setSelection] = useState("");

  // 브랜드 고르기 상태
  const [brandsData, setBrandsData] = useState<FoodBrandsResult | null>(null);
  const [brandsBusy, setBrandsBusy] = useState(false);
  const [brandsError, setBrandsError] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<SelectedBrand | null>(null);
  const [brandFilterText, setBrandFilterText] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);

  const controller = useRef<AbortController | null>(null);
  const brandController = useRef<AbortController | null>(null);
  const lastRequest = useRef<FoodSearchRequest | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const focusForm = useRef(false);
  const autoQueriedRef = useRef("");

  useEffect(() => {
    return () => {
      controller.current?.abort();
      brandController.current?.abort();
    };
  }, []);

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

  const loadBrands = useCallback(async (text: string) => {
    const term = text.trim().replace(/\s+/g, " ");
    if (term.length < 1 || term.length > 40) return;
    brandController.current?.abort();
    const request = new AbortController();
    brandController.current = request;
    setBrandsBusy(true);
    setBrandsError("");
    try {
      const params = new URLSearchParams({ q: term });
      const response = await fetch(`/api/foods/brands?${params}`, { signal: request.signal });
      const data = await response.json().catch(() => null);
      if (request.signal.aborted) return;
      if (!response.ok || !Array.isArray(data?.brands)) {
        setBrandsError(typeof data?.error === "string" ? data.error : "브랜드 목록을 불러오지 못했습니다.");
        setBrandsData(null);
        return;
      }
      setBrandsData(data as FoodBrandsResult);
    } catch {
      if (!request.signal.aborted) {
        setBrandsError("브랜드 목록을 불러오지 못했습니다.");
      }
    } finally {
      if (brandController.current === request) setBrandsBusy(false);
    }
  }, []);

  const search = useCallback(async ({ query: text, page, scope: nextScope, maker }: FoodSearchRequest) => {
    const term = text.trim().replace(/\s+/g, " ");
    const cleanMaker = maker.trim().replace(/\s+/g, " ");
    lastRequest.current = { query: term, page, scope: nextScope, maker: cleanMaker };
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
      const params = new URLSearchParams({ q: term, page: String(page), scope: nextScope });
      if (cleanMaker) params.set("maker", cleanMaker);
      const response = await fetch(`/api/foods/search?${params}`, { signal: request.signal });
      const data = await response.json().catch(() => null);
      if (request.signal.aborted) return;
      // 페이지 조회가 실패하면 이전 결과와 다시 시도할 수 있는 버튼을 남깁니다.
      if (!response.ok || !Array.isArray(data?.foods)) {
        setLoginRequired(response.status === 401);
        setError(typeof data?.error === "string" ? data.error : "검색 결과를 불러오지 못했습니다. 다시 검색해주세요.");
        return;
      }
      setResult({ ...(data as FoodSearchResult), query: term, scope: nextScope, maker: cleanMaker });
      setShowFullPage(Boolean(cleanMaker));
      setShowResults(true);
    } catch {
      if (!request.signal.aborted) {
        setError("연결을 확인한 뒤 다시 검색해주세요.");
      }
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }, []);

  const runFreshSearch = useCallback(
    (text: string, nextScope: FoodSearchScope) => {
      const term = text.trim().replace(/\s+/g, " ");
      setSelectedBrand(null);
      setBrandFilterText("");
      setShowAllBrands(false);
      setBrandsData(null);
      void search({ query: term, page: 1, scope: nextScope, maker: "" });
      if (term.length >= 1 && term.length <= 40) {
        void loadBrands(term);
      }
    },
    [loadBrands, search],
  );

  // 추천 음식에서 "공공데이터에서 검색" 링크로 진입하면 즉시 검색과 브랜드 목록을 함께 불러옵니다.
  useEffect(() => {
    if (!searchAvailable || !initialQuery || autoQueriedRef.current === initialQuery) return;
    autoQueriedRef.current = initialQuery;
    setQuery(initialQuery);
    runFreshSearch(initialQuery, "all");
  }, [initialQuery, runFreshSearch, searchAvailable]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runFreshSearch(query, scope);
  }

  function pickBrand(brand: PublicFoodBrand) {
    const activeQuery = result?.query ?? query.trim().replace(/\s+/g, " ");
    if (!activeQuery) return;
    const nextBrand: SelectedBrand = {
      label: brand.label,
      makerQuery: brand.makerQuery,
      sampleNames: brand.sampleNames,
    };
    setSelectedBrand(nextBrand);
    setScope("product");
    void search({ query: activeQuery, page: 1, scope: "product", maker: brand.makerQuery });
  }

  function selectCustomBrand(customLabel: string) {
    const clean = customLabel.trim().replace(/\s+/g, " ").slice(0, 60);
    const activeQuery = result?.query ?? query.trim().replace(/\s+/g, " ");
    if (!clean || !activeQuery) return;
    setSelectedBrand({ label: clean, makerQuery: clean });
    setScope("product");
    void search({ query: activeQuery, page: 1, scope: "product", maker: clean });
  }

  function clearBrand() {
    const activeQuery = result?.query ?? query.trim().replace(/\s+/g, " ");
    setSelectedBrand(null);
    if (!activeQuery) return;
    void search({ query: activeQuery, page: 1, scope, maker: "" });
  }

  function select(food: PublicFood) {
    // 기준량이나 영양값이 빠진 항목은 빈 입력란으로 남겨 사용자가 확인한 뒤 저장하게 합니다.
    focusForm.current = true;
    const appliedName = formatAppliedFoodName(food);
    setFields({
      name: appliedName,
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
    const brandNote = food.maker ? ` (${normalizeBrandInfo(food.maker)?.label ?? food.maker})` : "";
    setSelection(`${food.name}${brandNote} 정보를 불러왔습니다.${basisNote} ${guidance}`);
    setShowResults(false);
  }

  const filteredBrands = useMemo(() => {
    const list = brandsData?.brands ?? [];
    const term = normalizeMatchText(brandFilterText);
    if (!term) return list;
    return list.filter(
      (brand) =>
        normalizeMatchText(brand.label).includes(term) ||
        normalizeMatchText(brand.makerQuery).includes(term) ||
        brand.sampleNames.some((sample) => normalizeMatchText(sample).includes(term)),
    );
  }, [brandFilterText, brandsData]);

  const visibleBrands = useMemo(() => {
    if (showAllBrands || brandFilterText.trim()) return filteredBrands;
    return filteredBrands.slice(0, INITIAL_BRAND_COUNT);
  }, [brandFilterText, filteredBrands, showAllBrands]);

  const totalPages = result ? Math.min(100, Math.ceil(result.totalCount / result.pageSize)) : 0;
  const foods = result?.foods ?? [];
  const visibleFoods = showFullPage ? foods : foods.slice(0, INITIAL_RESULT_COUNT);
  const showBrandSection = Boolean(searchAvailable && (brandsBusy || brandsData || (result && result.query)));

  return (
    <>
      {searchAvailable ? (
        <section className="food-search" aria-labelledby="food-search-heading">
          <div className="section-heading food-search-heading">
            <div className="food-search-title-group">
              <SearchIcon size={18} />
              <h2 id="food-search-heading">공공 영양정보 검색</h2>
            </div>
            <a className="text-link" href="#food-form-heading">직접 입력</a>
          </div>
          <p className="food-search-lead">
            음식명을 검색하면 판매 브랜드를 바로 골라 제조사별 영양정보를 비교하고 등록 폼에 적용할 수 있어요.
          </p>
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
                  const nextMaker = nextScope === "general" ? "" : (selectedBrand?.makerQuery ?? "");
                  if (nextScope === "general") setSelectedBrand(null);
                  if (result) void search({ query: result.query, page: 1, scope: nextScope, maker: nextMaker });
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
                placeholder="예: 현미밥, 닭가슴살, 그릭요거트"
                onChange={(event) => {
                  // 검색어를 바꾸면 이전 요청을 취소해 늦은 응답이 섞이지 않게 합니다.
                  controller.current?.abort();
                  brandController.current?.abort();
                  setBusy(false);
                  setBrandsBusy(false);
                  setQuery(event.target.value);
                  setResult(null);
                  setBrandsData(null);
                  setSelectedBrand(null);
                  setBrandFilterText("");
                  setShowAllBrands(false);
                  setShowResults(false);
                  setError("");
                  setBrandsError("");
                  setLoginRequired(false);
                }}
                required
              />
            </div>
            <button className="primary-button" type="submit" disabled={busy}>
              <SearchIcon size={15} />
              <span>{busy ? "검색 중…" : "검색"}</span>
            </button>
          </form>

          {busy ? <p className="food-search-feedback" role="status">음식 정보를 찾고 있습니다…</p> : null}

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

          {showBrandSection ? (
            <section className="brand-picker" aria-labelledby="brand-picker-heading">
              <div className="brand-picker-header">
                <div className="brand-picker-title">
                  <TagIcon size={16} />
                  <h3 id="brand-picker-heading">
                    “{brandsData?.query ?? result?.query ?? query.trim()}” 브랜드 고르기
                  </h3>
                  {brandsData ? (
                    <span className="brand-picker-count">
                      {brandsData.brands.length}개 브랜드
                      {brandsData.totalProductCount > brandsData.sampledCount
                        ? ` · 상위 ${brandsData.sampledCount}건 기준`
                        : brandsData.totalProductCount > 0
                          ? ` · 판매 제품 ${brandsData.totalProductCount}건`
                          : ""}
                    </span>
                  ) : null}
                </div>
                {brandsData && brandsData.brands.length > 5 ? (
                  <div className="brand-filter-box">
                    <label htmlFor="brand-filter-input" className="sr-only">브랜드 또는 대표 제품명 검색</label>
                    <input
                      id="brand-filter-input"
                      type="search"
                      value={brandFilterText}
                      onChange={(event) => setBrandFilterText(event.target.value)}
                      placeholder="브랜드·제품명 찾기 (예: 햇반, 오뚜기)"
                    />
                  </div>
                ) : null}
              </div>

              {brandsBusy ? (
                <p className="brand-picker-status" role="status">판매 중인 브랜드 목록을 모아오는 중입니다…</p>
              ) : brandsError ? (
                <p className="brand-picker-status">{brandsError}</p>
              ) : brandsData && brandsData.brands.length > 0 ? (
                <>
                  <div className="brand-chip-list" role="group" aria-label="판매 브랜드 선택">
                    <button
                      type="button"
                      className={`brand-chip${!selectedBrand ? " is-active" : ""}`}
                      aria-pressed={!selectedBrand}
                      disabled={busy}
                      onClick={clearBrand}
                    >
                      <span className="brand-chip-name">전체 브랜드</span>
                    </button>
                    {visibleBrands.map((brand) => {
                      const isActive = selectedBrand?.makerQuery === brand.makerQuery && selectedBrand?.label === brand.label;
                      return (
                        <button
                          key={brand.key}
                          type="button"
                          className={`brand-chip${isActive ? " is-active" : ""}${brand.isMajor ? " is-major" : ""}`}
                          aria-pressed={isActive}
                          disabled={busy}
                          onClick={() => pickBrand(brand)}
                          title={brand.sampleNames.length ? `대표 제품: ${brand.sampleNames.join(", ")}` : brand.label}
                          aria-label={`${brand.label} 브랜드 선택 (${brand.count}건)`}
                        >
                          <span className="brand-chip-name">{brand.label}</span>
                          <span className="brand-chip-count">{brand.count}</span>
                        </button>
                      );
                    })}
                    {filteredBrands.length > INITIAL_BRAND_COUNT && !brandFilterText.trim() ? (
                      <button
                        type="button"
                        className="brand-chip-more"
                        aria-expanded={showAllBrands}
                        onClick={() => setShowAllBrands((prev) => !prev)}
                      >
                        {showAllBrands ? "주요 브랜드만 접기" : `+${filteredBrands.length - INITIAL_BRAND_COUNT}개 브랜드 더 보기`}
                      </button>
                    ) : null}
                  </div>
                  {brandFilterText.trim() && filteredBrands.length === 0 ? (
                    <div className="brand-filter-empty">
                      <p>목록에서 “{brandFilterText.trim()}” 브랜드를 찾지 못했습니다.</p>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => selectCustomBrand(brandFilterText)}
                      >
                        “{brandFilterText.trim()}” 제조사로 공공데이터 직접 검색
                      </button>
                    </div>
                  ) : null}
                </>
              ) : brandsData ? (
                <p className="brand-picker-status">
                  “{brandsData.query}”의 상용제품 브랜드가 등록되어 있지 않아 일반 음식·전체 결과만 표시합니다.
                </p>
              ) : null}

              {selectedBrand ? (
                <div className="brand-active-bar" role="status">
                  <span>
                    선택한 브랜드: <strong>{selectedBrand.label}</strong>
                    {selectedBrand.sampleNames?.length ? (
                      <small> · 예: {selectedBrand.sampleNames.join(", ")}</small>
                    ) : null}
                  </span>
                  <button type="button" className="brand-clear-button" onClick={clearBrand} disabled={busy}>
                    <XIcon size={14} />
                    <span>전체로 돌아가기</span>
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {result ? (
            <div className="food-search-results-panel" aria-busy={busy}>
              <div className="section-heading food-search-heading">
                <h3 ref={resultsHeading} tabIndex={-1}>
                  “{result.query}”{result.maker ? ` · ${selectedBrand?.label ?? result.maker}` : ""} 검색 결과{" "}
                  <span>{foodSearchScopes[result.scope]} · 총 {result.totalCount.toLocaleString("ko-KR")}건</span>
                </h3>
                {result.foods.length ? (
                  <button
                    className="secondary-button"
                    type="button"
                    aria-expanded={showResults}
                    aria-controls="public-food-results"
                    disabled={busy}
                    onClick={() => setShowResults(!showResults)}
                  >
                    {showResults ? "결과 접기" : "결과 다시 보기"}
                  </button>
                ) : null}
              </div>
              <div id="public-food-results" hidden={!showResults}>
                {result.totalCount > result.pageSize && !result.maker ? (
                  <p className="food-search-help">
                    결과가 많다면 위에서 브랜드를 고르거나 ‘일반 음식’·‘판매 제품’ 범위를 선택해보세요.
                  </p>
                ) : null}
                {foods.length > INITIAL_RESULT_COUNT && !showFullPage ? (
                  <div className="food-search-preview-controls">
                    <p role="status">이 페이지 {foods.length}개 중 {visibleFoods.length}개 표시</p>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-expanded={showFullPage}
                      aria-controls="public-food-list"
                      disabled={busy}
                      onClick={() => setShowFullPage(true)}
                    >
                      {foods.length - INITIAL_RESULT_COUNT}개 더 보기
                    </button>
                  </div>
                ) : foods.length > INITIAL_RESULT_COUNT && showFullPage ? (
                  <div className="food-search-preview-controls">
                    <p role="status">이 페이지 {foods.length}개 모두 표시 중</p>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-expanded={showFullPage}
                      aria-controls="public-food-list"
                      disabled={busy}
                      onClick={() => setShowFullPage(false)}
                    >
                      처음 {INITIAL_RESULT_COUNT}개만 보기
                    </button>
                  </div>
                ) : null}
                {foods.length ? (
                  <ul id="public-food-list" className="food-search-results" role="list">
                    {visibleFoods.map((food, index) => {
                      const brandLabel = food.maker ? normalizeBrandInfo(food.maker)?.label : null;
                      return (
                        <li key={`${food.code}-${index}`}>
                          <details>
                            <summary className="food-search-result-heading">
                              <span className="food-search-item-main">
                                <strong>{food.name}</strong>
                                <span className="food-search-badges">
                                  {brandLabel ? <span className="food-brand-pill">{brandLabel}</span> : null}
                                  {food.dbClass ? (
                                    <span className="food-class-pill">
                                      {food.dbClass === "product" ? "판매 제품" : "일반 음식"}
                                    </span>
                                  ) : null}
                                  <span className="food-search-basis">
                                    {food.basis
                                      ? `${food.basis.amount} ${foodUnits[food.basis.unit]} ${food.basis.unit === "ml" ? "부피 기준" : "기준"}`
                                      : "기준량 미제공"}
                                  </span>
                                </span>
                              </span>
                              <span className="food-search-summary-right">
                                {food.nutrients.calories !== null ? (
                                  <span className="food-search-kcal-chip">{food.nutrients.calories} kcal</span>
                                ) : null}
                                <span className="food-search-details-label">영양정보</span>
                              </span>
                            </summary>
                            {/* 값이 제공되지 않은 영양소는 실제 0과 구분합니다. */}
                            <div className="food-search-result-details">
                              {food.maker ? (
                                <p className="food-search-raw-maker">제조사: {food.maker}</p>
                              ) : null}
                              <dl className="food-search-nutrients">
                                {nutrientFields.map(({ key, label, unit }) => (
                                  <div key={key} className={key}>
                                    <dt>{label}</dt>
                                    <dd>
                                      {food.nutrients[key] === null ? (
                                        <small>미제공</small>
                                      ) : (
                                        <>
                                          {food.nutrients[key]} <small>{unit}</small>
                                        </>
                                      )}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                              <button
                                type="button"
                                className="primary-button food-result-button"
                                disabled={busy}
                                onClick={() => select(food)}
                                aria-label={`등록 폼에 적용 — ${food.name}${food.maker ? `, ${food.maker}` : ""}${food.basis ? `, ${food.basis.amount} ${foodUnits[food.basis.unit]} 기준` : ""}`}
                              >
                                등록 폼에 적용
                              </button>
                            </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="food-search-feedback">
                    {result.totalCount > 0
                      ? "이 페이지에는 맞는 기준 단위의 결과가 없어요. 다른 페이지를 확인하거나 직접 입력해 보세요."
                      : result.maker
                        ? "선택한 브랜드와 검색어에 맞는 결과가 없어요. ‘전체 브랜드’로 돌아가거나 다른 검색어로 찾아보세요."
                        : "검색 범위를 ‘전체’로 바꾸거나 다른 음식명으로 검색해 보세요."}
                  </p>
                )}
                {totalPages > 1 ? (
                  <nav className="food-search-pagination" aria-label="검색 결과 페이지">
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={busy || result.page <= 1}
                      onClick={() => void search({ ...result, page: result.page - 1 })}
                    >
                      이전
                    </button>
                    <span>{result.page} / {totalPages} 페이지</span>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={busy || result.page >= totalPages}
                      onClick={() => void search({ ...result, page: result.page + 1 })}
                    >
                      다음
                    </button>
                  </nav>
                ) : null}
              </div>
            </div>
          ) : null}
          <a
            className="food-search-source text-link"
            href="https://www.data.go.kr/data/15127578/openapi.do"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>출처: 식품의약품안전처 식품영양성분DB정보 (새 창)</span>
            <ExternalLinkIcon size={13} />
          </a>
        </section>
      ) : (
        <p className="notice info-notice">공공 영양정보 검색을 사용할 수 없습니다. 아래에서 직접 등록할 수 있어요.</p>
      )}
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
