import { FoodSearchError, searchPublicFoods, withFoodSearchAuth } from "@/lib/foodNutritionApi";

export const runtime = "nodejs";

// 인증키를 서버에 보관하고 로그인한 사용자의 명시적인 검색만 중계합니다.
export async function GET(request: Request) {
  return withFoodSearchAuth(
    request,
    "음식 검색을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
    (params, query) => {
      const pageText = params.get("page") ?? "1";
      const page = Number(pageText);
      const scope = params.get("scope") ?? "all";
      const maker = (params.get("maker") ?? "").trim().replace(/\s+/g, " ");
      if (!/^\d{1,3}$/.test(pageText) || !Number.isInteger(page) || page < 1 || page > 100) {
        throw new FoodSearchError(400, "음식명은 1~40자로, 검색 페이지는 1~100으로 입력해주세요.");
      }
      if (scope !== "all" && scope !== "general" && scope !== "product") {
        throw new FoodSearchError(400, "검색 범위를 다시 선택해주세요.");
      }
      if (maker.length > 60) {
        throw new FoodSearchError(400, "브랜드명은 60자 이하로 입력해주세요.");
      }
      return searchPublicFoods(query, page, scope, maker);
    },
  );
}
