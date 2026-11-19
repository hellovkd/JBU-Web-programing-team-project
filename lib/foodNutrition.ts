// 검색 결과는 화면에서 선택할 때만 기존 음식 입력값으로 옮기며 DB에 자동 저장하지 않습니다.
export type PublicFood = {
  code: string;
  name: string;
  maker: string;
  dbClass?: "general" | "product";
  basis: { amount: number; unit: "g" | "ml" | "piece" | "serving" } | null;
  nutrients: { calories: number | null; carbs: number | null; protein: number | null; fat: number | null };
};

// totalCount와 pageSize는 기준 단위로 걸러내기 전의 공공 API 페이지 정보입니다.
export type FoodSearchResult = { foods: PublicFood[]; totalCount: number; page: number; pageSize: number };

export type PublicFoodBrand = {
  key: string;
  label: string;
  makerQuery: string;
  count: number;
  sampleNames: string[];
  isMajor: boolean;
};

export type FoodBrandsResult = {
  query: string;
  brands: PublicFoodBrand[];
  sampledCount: number;
  totalProductCount: number;
};

// 화면 용어와 공공 API 분류 코드를 구분하고 검색 범위를 공통 타입으로 사용합니다.
export const foodSearchScopes = { all: "전체", general: "일반 음식", product: "판매 제품" } as const;
export type FoodSearchScope = keyof typeof foodSearchScopes;

export function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// 누락·미량·범위 표기를 실제 0으로 처리하지 않아 잘못된 영양값 저장을 막습니다.
function numeric(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text.replaceAll(",", ""));
  return Number.isFinite(number) && number <= 100000 ? number : null;
}

function basis(value: unknown): PublicFood["basis"] {
  if (typeof value !== "string") return null;
  const match = value.normalize("NFKC").trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|dl|l|개|인분|회분|serving)$/i);
  if (!match) return null;
  const label = match[2].toLowerCase();
  const amount = Number(match[1]);
  // 기준량의 차원은 유지하고 kg, L, dL만 각각 g 또는 mL로 바꿉니다.
  const normalized = {
    kg: { amount: amount * 1000, unit: "g" },
    g: { amount, unit: "g" },
    l: { amount: amount * 1000, unit: "ml" },
    dl: { amount: amount * 100, unit: "ml" },
    ml: { amount, unit: "ml" },
    개: { amount, unit: "piece" },
    인분: { amount, unit: "serving" },
    회분: { amount, unit: "serving" },
    serving: { amount, unit: "serving" },
  } as const;
  const result = normalized[label as keyof typeof normalized];
  return result.amount > 0 && result.amount <= 5000 ? result : null;
}

const drinkCategories = new Set(["음료류", "음료 및 차류"]);
const waterNames = new Set(["생수", "먹는샘물", "탄산수"]);
const mixedUnitCategories = new Set(["국 및 탕류", "찌개 및 전골류", "식용유지류", "장류, 양념류", "장류", "조미식품"]);

export function hasSearchBasis(value: unknown, food: PublicFood) {
  if (!food.basis || food.basis.unit === "serving") return false;
  const row = asObject(value);
  const category = typeof row.FOOD_CAT1_NM === "string" ? row.FOOD_CAT1_NM.trim() : "";
  // 우유와 가공유는 치즈·분유와 같은 유가공품 분류에 있어 중분류 코드를 함께 확인합니다.
  const milk = category === "유가공품류" && (row.FOOD_CAT2_CD === "1900001" || row.FOOD_CAT2_CD === "1900002");
  // 생수처럼 넓은 분류로 들어온 항목은 이름 전체가 물 종류와 일치할 때만 액체로 봅니다.
  if (drinkCategories.has(category) || milk || waterNames.has(food.name)) return food.basis.unit === "ml";
  // 국물·조미식품·발효유 등은 제품마다 원본에 중량 또는 부피 기준이 모두 쓰입니다.
  const fermentedMilk = category === "유가공품류" && row.FOOD_CAT2_CD === "1900004";
  if (food.basis.unit === "ml") return mixedUnitCategories.has(category) || fermentedMilk;
  return true;
}

// 식약처 FoodNtrCpntDbInfo03 명세의 영양성분함량기준량을 사용합니다.
// 식품 총중량(Z10500)이나 1회 섭취참고량을 영양성분의 기준량으로 대체하지 않습니다.
export function parsePublicFood(value: unknown): PublicFood | undefined {
  const row = asObject(value);
  const text = (key: string, max: number) => typeof row[key] === "string" ? (row[key] as string).trim().slice(0, max) : "";
  const code = text("FOOD_CD", 80);
  const name = text("FOOD_NM_KR", 80);
  if (!code || !name) return undefined;
  const rawClass = text("DB_CLASS_NM", 20);
  const dbClass = rawClass === "품목대표" ? "general" : rawClass === "상용제품" ? "product" : undefined;
  return {
    code,
    name,
    maker: text("MAKER_NM", 100),
    dbClass,
    basis: basis(row.SERVING_SIZE),
    nutrients: { calories: numeric(row.AMT_NUM1), carbs: numeric(row.AMT_NUM6), protein: numeric(row.AMT_NUM3), fat: numeric(row.AMT_NUM4) },
  };
}

const IGNORED_MAKERS = new Set(["", "해당없음", "-", "알수없음", "기타", "없음"]);

const MAJOR_BRAND_RULES: ReadonlyArray<{
  patterns: RegExp[];
  key: string;
  label: string;
  makerQueryFromRaw?: (raw: string) => string;
  defaultQuery: string;
  isMajor: boolean;
}> = [
  {
    patterns: [/씨제이/i, /\bcj\s*(제일제당|푸드|프레시)/i],
    key: "cj",
    label: "CJ제일제당",
    makerQueryFromRaw: (raw) => (/cj/i.test(raw) && !/씨제이/.test(raw) ? "CJ" : "씨제이"),
    defaultQuery: "씨제이",
    isMajor: true,
  },
  {
    patterns: [/동원/],
    key: "dongwon",
    label: "동원F&B",
    defaultQuery: "동원",
    isMajor: true,
  },
  {
    patterns: [/오뚜기/],
    key: "ottogi",
    label: "오뚜기",
    defaultQuery: "오뚜기",
    isMajor: true,
  },
  {
    patterns: [/풀무원/],
    key: "pulmuone",
    label: "풀무원",
    defaultQuery: "풀무원",
    isMajor: true,
  },
  {
    patterns: [/하림/],
    key: "harim",
    label: "하림",
    defaultQuery: "하림",
    isMajor: true,
  },
  {
    patterns: [/대상/],
    key: "daesang",
    label: "대상",
    defaultQuery: "대상",
    isMajor: true,
  },
  {
    patterns: [/농심/],
    key: "nongshim",
    label: "농심",
    defaultQuery: "농심",
    isMajor: true,
  },
  {
    patterns: [/아워홈/],
    key: "ourhome",
    label: "아워홈",
    defaultQuery: "아워홈",
    isMajor: true,
  },
  {
    patterns: [/현대그린푸드/],
    key: "hyundaigreen",
    label: "현대그린푸드",
    defaultQuery: "현대그린푸드",
    isMajor: true,
  },
  {
    patterns: [/신세계푸드/],
    key: "shinsegae",
    label: "신세계푸드",
    defaultQuery: "신세계푸드",
    isMajor: true,
  },
  {
    patterns: [/롯데/],
    key: "lotte",
    label: "롯데",
    defaultQuery: "롯데",
    isMajor: true,
  },
  {
    patterns: [/삼양/],
    key: "samyang",
    label: "삼양",
    defaultQuery: "삼양",
    isMajor: true,
  },
  {
    patterns: [/빙그레/],
    key: "binggrae",
    label: "빙그레",
    defaultQuery: "빙그레",
    isMajor: true,
  },
  {
    patterns: [/매일유업/],
    key: "maeil",
    label: "매일유업",
    defaultQuery: "매일유업",
    isMajor: true,
  },
  {
    patterns: [/서울우유/],
    key: "seoulmilk",
    label: "서울우유",
    defaultQuery: "서울우유",
    isMajor: true,
  },
  {
    patterns: [/남양유업/],
    key: "namyang",
    label: "남양유업",
    defaultQuery: "남양유업",
    isMajor: true,
  },
  {
    patterns: [/쥬비스/],
    key: "juvis",
    label: "쥬비스다이어트",
    defaultQuery: "쥬비스",
    isMajor: true,
  },
  {
    patterns: [/푸드나무/],
    key: "foodnamoo",
    label: "푸드나무",
    defaultQuery: "푸드나무",
    isMajor: true,
  },
  {
    patterns: [/허닭/],
    key: "heodak",
    label: "허닭",
    defaultQuery: "허닭",
    isMajor: true,
  },
  {
    patterns: [/본아이에프/],
    key: "bonif",
    label: "본아이에프",
    defaultQuery: "본아이에프",
    isMajor: true,
  },
  {
    patterns: [/시아스/],
    key: "sias",
    label: "시아스",
    defaultQuery: "시아스",
    isMajor: false,
  },
];

export function normalizeBrandInfo(rawMaker: string): {
  key: string;
  label: string;
  makerQuery: string;
  isMajor: boolean;
} | null {
  const raw = rawMaker.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (IGNORED_MAKERS.has(raw)) return null;

  for (const rule of MAJOR_BRAND_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(raw))) {
      return {
        key: rule.key,
        label: rule.label,
        makerQuery: rule.makerQueryFromRaw ? rule.makerQueryFromRaw(raw) : rule.defaultQuery,
        isMajor: rule.isMajor,
      };
    }
  }

  // 법인 표기와 공장/센터 접미사를 덜어내 브랜드명과 부분 검색어를 함께 얻습니다.
  const cleaned = raw
    .replace(/㈜|\(주\)|\(유\)|\(사\)|\(재\)|\(합\)|(?:^|\s)주\)/g, " ")
    .replace(/(?:주식회사|유한회사|합자회사|사단법인|재단법인|농업회사법인|어업회사법인)/g, " ")
    .replace(/진천\s*BLOSSOM.*$/i, " ")
    .replace(/\s+(?:제?\d+공장|[가-힣A-Za-z0-9]+공장|스마트푸드센터|식품소재가공센터|쥬비스푸드점|[가-힣A-Za-z0-9]+지점|[가-힣A-Za-z0-9]+센터)\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const finalLabel = cleaned || raw;
  return {
    key: finalLabel.replace(/\s+/g, "").toLowerCase(),
    label: finalLabel,
    makerQuery: finalLabel,
    isMajor: false,
  };
}

export function formatAppliedFoodName(food: PublicFood): string {
  const cleanName = food.name.trim();
  if (!food.maker) return cleanName.slice(0, 80);
  const brand = normalizeBrandInfo(food.maker);
  const brandLabel = brand?.label ?? food.maker.trim();
  if (!brandLabel) return cleanName.slice(0, 80);

  const normName = cleanName.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  const normBrand = brandLabel.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  if (normName.includes(normBrand)) return cleanName.slice(0, 80);
  return `${cleanName} (${brandLabel})`.slice(0, 80);
}
