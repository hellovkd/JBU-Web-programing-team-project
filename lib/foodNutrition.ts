// 검색 결과는 화면에서 선택할 때만 기존 음식 입력값으로 옮기며 DB에 자동 저장하지 않습니다.
export type PublicFood = {
  code: string;
  name: string;
  maker: string;
  basis: { amount: number; unit: "g" | "ml" | "piece" | "serving" } | null;
  nutrients: { calories: number | null; carbs: number | null; protein: number | null; fat: number | null };
};

export type FoodSearchResult = { foods: PublicFood[]; totalCount: number; page: number; pageSize: number };

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
  const match = value.trim().replaceAll("㎖", "ml").replaceAll("㎗", "dl").match(/^(\d+(?:\.\d+)?)\s*(g|ml|개|인분|회분|serving)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (amount <= 0 || amount > 5000) return null;
  const label = match[2].toLowerCase();
  const unit = label === "개" ? "piece" : ["인분", "회분", "serving"].includes(label) ? "serving" : label as "g" | "ml";
  return { amount, unit };
}

// 식약처 FoodNtrCpntDbInfo03 명세의 영양성분함량기준량을 사용합니다.
// 식품 총중량(Z10500)이나 1회 섭취참고량을 영양성분의 기준량으로 대체하지 않습니다.
export function parsePublicFood(value: unknown): PublicFood | undefined {
  const row = asObject(value);
  const text = (key: string, max: number) => typeof row[key] === "string" ? (row[key] as string).trim().slice(0, max) : "";
  const code = text("FOOD_CD", 80);
  const name = text("FOOD_NM_KR", 80);
  if (!code || !name) return undefined;
  return {
    code, name, maker: text("MAKER_NM", 100), basis: basis(row.SERVING_SIZE),
    nutrients: { calories: numeric(row.AMT_NUM1), carbs: numeric(row.AMT_NUM6), protein: numeric(row.AMT_NUM3), fat: numeric(row.AMT_NUM4) },
  };
}
