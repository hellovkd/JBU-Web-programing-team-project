"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FoodFields, emptyFoodFields, type FoodFieldValues } from "@/components/FoodFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createFavoriteFoodAction } from "@/lib/mealActions";
import { foodUnits } from "@/lib/mealNutrition";
import type { FoodSearchResult, PublicFood } from "@/lib/foodNutrition";

const numberText = (value: number | null) => value === null ? "" : String(value);

// 검색과 저장은 별도 폼으로 두어 검색만으로 음식이 등록되거나 기존 입력이 제출되지 않게 합니다.
export function FoodRegistration({ searchAvailable }: { searchAvailable: boolean }) {
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<FoodFieldValues>(emptyFoodFields);
  const [result, setResult] = useState<FoodSearchResult | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function search(text: string, page = 1) {
    const term = text.trim();
    if (term.length < 2 || term.length > 40) { setError("음식명을 2~40자로 입력해주세요."); return; }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/foods/search?${new URLSearchParams({ q: term, page: String(page) })}`, { signal: request.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "검색 결과를 불러오지 못했습니다.");
      if (!Array.isArray(data.foods)) throw new Error("검색 결과를 확인할 수 없습니다.");
      if (request.signal.aborted) return;
      setResult(data as FoodSearchResult);
      setSearchedQuery(term);
    } catch (reason) {
      if (!request.signal.aborted) { setResult(null); setError(reason instanceof Error ? reason.message : "검색 결과를 불러오지 못했습니다."); }
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search(query); }

  function select(food: PublicFood) {
    // 기준량이나 영양값이 빠진 항목은 빈 입력란으로 남겨 사용자가 확인한 뒤 저장하게 합니다.
    setFields({ name: food.name, baseAmount: food.basis ? String(food.basis.amount) : "", unit: food.basis?.unit ?? "g", calories: numberText(food.nutrients.calories), carbs: numberText(food.nutrients.carbs), protein: numberText(food.nutrients.protein), fat: numberText(food.nutrients.fat) });
    const missing = !food.basis || Object.values(food.nutrients).some((value) => value === null);
    setSelection(`${food.name} 정보를 불러왔습니다. ${missing ? "비어 있는 기준량·영양값과 단위를 확인해 입력해주세요." : "아래 내용을 확인한 뒤 저장해주세요."}`);
  }

  return (
    <>
      <section className="food-search" aria-labelledby="food-search-heading">
        <h3 id="food-search-heading">공공 음식 정보로 찾기</h3>
        <p className="field-hint">음식을 검색해 영양정보를 불러오거나, 아래에 직접 입력하세요.</p>
        {searchAvailable ? (
          <>
            <form onSubmit={submitSearch} className="food-search-form" role="search" aria-label="공공 음식 정보 검색">
              <div className="field-group">
                <label htmlFor="public-food-query">음식명</label>
                <input id="public-food-query" type="search" value={query} minLength={2} maxLength={40} placeholder="예: 현미밥, 닭가슴살" onChange={(event) => { controller.current?.abort(); setBusy(false); setQuery(event.target.value); setResult(null); setError(""); }} required />
              </div>
              <button className="secondary-button" type="submit" disabled={busy}>{busy ? "검색 중" : "검색"}</button>
            </form>
            <div aria-live="polite" aria-atomic="true" className="food-search-feedback">
              {busy ? <p className="field-hint" role="status">음식 정보를 찾고 있습니다.</p> : null}
              {error ? <p className="field-error" role="alert">{error}</p> : null}
              {result && !busy ? <p className="field-hint">{result.foods.length ? `${searchedQuery} 검색 결과 · ${result.totalCount.toLocaleString("ko-KR")}건` : "검색 결과가 없습니다. 짧은 음식명으로 다시 검색하거나 직접 입력해주세요."}</p> : null}
            </div>
            {result ? (
              <div aria-busy={busy}>
                <ul className="food-search-results">
                  {result.foods.map((food, index) => (
                    <li key={`${food.code}-${index}`}>
                      <div><strong>{food.name}</strong>{food.maker ? <small>{food.maker}</small> : null}<p>{food.basis ? `${food.basis.amount}${foodUnits[food.basis.unit]} 기준` : "기준량 확인 필요"} · {food.nutrients.calories === null ? "열량 확인 필요" : `${food.nutrients.calories} kcal`}</p></div>
                      <button type="button" className="secondary-button" disabled={busy} onClick={() => select(food)} aria-label={`${food.name} 영양정보 불러오기`}>불러오기</button>
                    </li>
                  ))}
                </ul>
                {result.totalCount > result.pageSize ? (
                  <div className="food-search-pagination" aria-label="검색 결과 페이지">
                    <button className="secondary-button" type="button" disabled={busy || result.page <= 1} onClick={() => void search(searchedQuery, result.page - 1)}>이전</button>
                    <span>{result.page} / {Math.min(100, Math.ceil(result.totalCount / result.pageSize))}</span>
                    <button className="secondary-button" type="button" disabled={busy || result.page >= 100 || result.page * result.pageSize >= result.totalCount} onClick={() => void search(searchedQuery, result.page + 1)}>다음</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : <p className="field-hint">음식 검색을 준비 중입니다. 아래에서 직접 등록할 수 있어요.</p>}
        <a className="food-search-source text-link" href="https://www.data.go.kr/data/15127578/openapi.do" target="_blank" rel="noopener noreferrer">출처: 식품의약품안전처 식품영양성분DB정보 (새 창)</a>
      </section>
      {selection ? <p className="notice info-notice" role="status">{selection}</p> : null}
      <form action={createFavoriteFoodAction} className="food-form">
        <FoodFields values={fields} onChange={setFields} />
        <SubmitButton label="음식 저장" />
      </form>
    </>
  );
}
