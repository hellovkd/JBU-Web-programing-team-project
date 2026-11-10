import { asObject, parsePublicFood, type FoodSearchResult } from "@/lib/foodNutrition";

const ENDPOINT = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03";
const PAGE_SIZE = 10;
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 100;
const cache = new Map<string, { expires: number; result: FoodSearchResult }>();
const pending = new Map<string, Promise<FoodSearchResult>>();

export class FoodSearchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function apiKey() {
  // 공공데이터포털의 일반 키와 이미 인코딩된 키를 모두 한 번만 URL 인코딩합니다.
  const key = process.env.FOOD_NUTRITION_API_KEY?.trim();
  if (!key) throw new FoodSearchError(503, "음식 검색을 준비 중입니다. 직접 입력으로 등록해주세요.");
  try { return decodeURIComponent(key); } catch { return key; }
}

async function loadFoods(query: string, page: number): Promise<FoodSearchResult> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ serviceKey: apiKey(), type: "json", pageNo: String(page), numOfRows: String(PAGE_SIZE), FOOD_NM_KR: query }).toString();
  let payload: unknown;
  try {
    // 인증키가 포함된 URL·원본 오류는 로그나 클라이언트 응답에 노출하지 않습니다.
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("upstream-http");
    payload = await response.json();
  } catch {
    throw new FoodSearchError(502, "공공 음식 정보를 불러오지 못했습니다. 잠시 후 다시 검색하거나 직접 입력해주세요.");
  }
  const root = asObject(payload);
  const response = root.response === undefined ? root : asObject(root.response);
  const header = asObject(response.header);
  const code = String(header.resultCode ?? "");
  if (code !== "00" && code !== "0") {
    const limited = ["22", "23"].includes(code);
    throw new FoodSearchError(limited ? 429 : 502, limited ? "검색 요청이 많습니다. 잠시 후 다시 시도해주세요." : "공공 음식 검색을 현재 이용할 수 없습니다. 직접 입력으로 등록해주세요.");
  }
  const body = asObject(response.body);
  const totalCount = Number(body.totalCount);
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) throw new FoodSearchError(502, "공공 음식 정보의 응답을 확인할 수 없습니다.");
  const items = body.items;
  const raw = Array.isArray(items) ? items : asObject(items).item;
  if (totalCount > 0 && raw == null) throw new FoodSearchError(502, "공공 음식 정보의 형식이 올바르지 않습니다.");
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const foods = rows.slice(0, PAGE_SIZE).map(parsePublicFood).filter((food) => food !== undefined);
  if (rows.length && !foods.length) throw new FoodSearchError(502, "공공 음식 정보의 형식이 올바르지 않습니다.");
  return { foods, totalCount, page, pageSize: PAGE_SIZE };
}

export async function searchPublicFoods(query: string, page: number) {
  apiKey();
  const key = JSON.stringify([query, page]);
  const now = Date.now();
  // 검색 결과만 짧게 메모리에 보관합니다. MongoDB와 Next.js 디스크 캐시에는 쓰지 않습니다.
  for (const [name, entry] of cache) if (entry.expires <= now) cache.delete(name);
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit.result; }
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= 10) throw new FoodSearchError(429, "검색 요청이 많습니다. 잠시 후 다시 시도해주세요.");
  const task = loadFoods(query, page).then((result) => {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + CACHE_TTL, result });
    return result;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
