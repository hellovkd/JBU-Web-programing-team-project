import { auth } from "@/auth";
import {
  asObject,
  hasSearchBasis,
  normalizeBrandInfo,
  parsePublicFood,
  type FoodBrandsResult,
  type FoodSearchResult,
  type FoodSearchScope,
  type PublicFoodBrand,
} from "@/lib/foodNutrition";

const ENDPOINT = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03";
const PAGE_SIZE = 10;
const BRAND_SAMPLE_PAGE_SIZE = 100;
const BRAND_MAX_PAGES = 3;
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 100;
const upstreamClass = { general: "품목대표", product: "상용제품" } as const;

export class FoodSearchError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiKey() {
  // 공공데이터포털의 일반 키와 이미 인코딩된 키를 모두 한 번만 URL 인코딩합니다.
  const key = process.env.FOOD_NUTRITION_API_KEY?.trim();
  if (!key) throw new FoodSearchError(503, "음식 검색을 준비 중입니다. 직접 입력으로 등록해주세요.");
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function createCachedLoader<T>() {
  const cache = new Map<string, { expires: number; result: T }>();
  const pending = new Map<string, Promise<T>>();

  return async (key: string, load: () => Promise<T>): Promise<T> => {
    apiKey();
    const now = Date.now();
    // 검색 결과만 짧게 메모리에 보관합니다. MongoDB와 Next.js 디스크 캐시에는 쓰지 않습니다.
    for (const [name, entry] of cache) if (entry.expires <= now) cache.delete(name);
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit.result;
    }
    const existing = pending.get(key);
    if (existing) return existing;
    if (pending.size >= 10) throw new FoodSearchError(429, "검색 요청이 많습니다. 잠시 후 다시 시도해주세요.");

    const task = load()
      .then((result) => {
        if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
        cache.set(key, { expires: Date.now() + CACHE_TTL, result });
        return result;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}

const loadCachedFoods = createCachedLoader<FoodSearchResult>();
const loadCachedBrands = createCachedLoader<FoodBrandsResult>();

async function fetchUpstreamPage(params: Record<string, string>): Promise<{ rows: unknown[]; totalCount: number }> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    serviceKey: apiKey(),
    type: "json",
    ...params,
  }).toString();

  let payload: unknown;
  try {
    // 인증키가 포함된 URL·원본 오류는 로그나 클라이언트 응답에 노출하지 않습니다.
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
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
    throw new FoodSearchError(
      limited ? 429 : 502,
      limited
        ? "검색 요청이 많습니다. 잠시 후 다시 시도해주세요."
        : "공공 음식 검색을 현재 이용할 수 없습니다. 직접 입력으로 등록해주세요.",
    );
  }

  const body = asObject(response.body);
  const totalCount = Number(body.totalCount);
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new FoodSearchError(502, "공공 음식 정보의 응답을 확인할 수 없습니다.");
  }
  const items = body.items;
  const raw = Array.isArray(items) ? items : asObject(items).item;
  if (totalCount > 0 && raw == null) {
    throw new FoodSearchError(502, "공공 음식 정보의 형식이 올바르지 않습니다.");
  }
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return { rows, totalCount };
}

async function loadFoods(
  query: string,
  page: number,
  scope: FoodSearchScope,
  maker: string,
): Promise<FoodSearchResult> {
  const params: Record<string, string> = {
    pageNo: String(page),
    numOfRows: String(PAGE_SIZE),
    FOOD_NM_KR: query,
  };
  // 제조사(브랜드)를 선택하면 상용제품 기준으로 정확히 조회합니다.
  if (maker) {
    params.MAKER_NM = maker;
    params.DB_CLASS_NM = scope === "general" ? upstreamClass.general : upstreamClass.product;
  } else if (scope !== "all") {
    // 일부 페이지를 받은 뒤 숨기지 않고 공공 API에 검색 범위를 전달합니다.
    params.DB_CLASS_NM = upstreamClass[scope];
  }

  const { rows, totalCount } = await fetchUpstreamPage(params);
  const parsed = rows.slice(0, PAGE_SIZE).flatMap((row) => {
    const food = parsePublicFood(row);
    return food ? [{ row, food }] : [];
  });
  if (rows.length && !parsed.length) {
    throw new FoodSearchError(502, "공공 음식 정보의 형식이 올바르지 않습니다.");
  }

  // 단위가 맞지 않는 항목이 페이지 전체를 차지해도 다음 원본 페이지로 이동할 수 있게 합니다.
  const foods = parsed.filter(({ row, food }) => hasSearchBasis(row, food)).map(({ food }) => food);
  const normalizedName = (name: string) => name.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  const term = normalizedName(query);
  // 같은 페이지 안에서는 음식명이 검색어와 일치하는 항목을 먼저 보여줍니다.
  foods.sort((first, second) => Number(normalizedName(second.name) === term) - Number(normalizedName(first.name) === term));
  return { foods, totalCount, page, pageSize: PAGE_SIZE };
}

export function searchPublicFoods(
  query: string,
  page: number,
  scope: FoodSearchScope = "all",
  maker = "",
) {
  const cleanMaker = maker.trim().replace(/\s+/g, " ");
  const key = JSON.stringify([query, page, scope, cleanMaker]);
  return loadCachedFoods(key, () => loadFoods(query, page, scope, cleanMaker));
}

async function loadBrands(query: string): Promise<FoodBrandsResult> {
  const firstPage = await fetchUpstreamPage({
    pageNo: "1",
    numOfRows: String(BRAND_SAMPLE_PAGE_SIZE),
    FOOD_NM_KR: query,
    DB_CLASS_NM: upstreamClass.product,
  });

  const allRows: unknown[] = [...firstPage.rows];
  if (firstPage.totalCount > BRAND_SAMPLE_PAGE_SIZE) {
    const totalPages = Math.min(BRAND_MAX_PAGES, Math.ceil(firstPage.totalCount / BRAND_SAMPLE_PAGE_SIZE));
    const extraPageNumbers = Array.from({ length: totalPages - 1 }, (_, idx) => idx + 2);
    const extraPages = await Promise.all(
      extraPageNumbers.map((pageNo) =>
        fetchUpstreamPage({
          pageNo: String(pageNo),
          numOfRows: String(BRAND_SAMPLE_PAGE_SIZE),
          FOOD_NM_KR: query,
          DB_CLASS_NM: upstreamClass.product,
        }),
      ),
    );
    for (const page of extraPages) allRows.push(...page.rows);
  }

  const brandMap = new Map<
    string,
    { key: string; label: string; makerQuery: string; count: number; sampleNames: Set<string>; isMajor: boolean }
  >();

  for (const row of allRows) {
    const food = parsePublicFood(row);
    if (!food || !hasSearchBasis(row, food) || !food.maker) continue;
    const brand = normalizeBrandInfo(food.maker);
    if (!brand) continue;

    const existing = brandMap.get(brand.key);
    if (existing) {
      existing.count += 1;
      if (existing.sampleNames.size < 2) existing.sampleNames.add(food.name);
    } else {
      brandMap.set(brand.key, {
        key: brand.key,
        label: brand.label,
        makerQuery: brand.makerQuery,
        count: 1,
        sampleNames: new Set([food.name]),
        isMajor: brand.isMajor,
      });
    }
  }

  const brands: PublicFoodBrand[] = [...brandMap.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      makerQuery: entry.makerQuery,
      count: entry.count,
      sampleNames: [...entry.sampleNames],
      isMajor: entry.isMajor,
    }))
    .sort((a, b) => {
      if (a.isMajor !== b.isMajor) return Number(b.isMajor) - Number(a.isMajor);
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "ko");
    });

  return {
    query,
    brands,
    sampledCount: allRows.length,
    totalProductCount: firstPage.totalCount,
  };
}

export function searchPublicFoodBrands(query: string): Promise<FoodBrandsResult> {
  return loadCachedBrands(query, () => loadBrands(query));
}

/** 인증키를 서버에만 보관하고 로그인 사용자 검증 및 공통 오류 처리를 수행합니다. */
export async function withFoodSearchAuth(
  request: Request,
  fallbackError: string,
  run: (params: URLSearchParams, query: string) => Promise<unknown>,
) {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  try {
    const session = await auth();
    if (!session?.user?.email) return reply({ error: "로그인 후 음식 검색을 이용해주세요." }, 401);
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().replace(/\s+/g, " ");
    if (query.length < 1 || query.length > 40) {
      return reply({ error: "음식명은 1~40자로 입력해주세요." }, 400);
    }
    return reply(await run(params, query));
  } catch (error) {
    if (error instanceof FoodSearchError) return reply({ error: error.message }, error.status);
    return reply({ error: fallbackError }, 500);
  }
}
