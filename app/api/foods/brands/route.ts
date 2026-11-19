import { searchPublicFoodBrands, withFoodSearchAuth } from "@/lib/foodNutritionApi";

export const runtime = "nodejs";

// 검색어에 해당하는 판매 제품의 브랜드(제조사) 목록만 집계해 반환합니다.
export async function GET(request: Request) {
  return withFoodSearchAuth(
    request,
    "브랜드 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    (_params, query) => searchPublicFoodBrands(query),
  );
}
