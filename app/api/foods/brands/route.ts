import { auth } from "@/auth";
import { FoodSearchError, searchPublicFoodBrands } from "@/lib/foodNutritionApi";

export const runtime = "nodejs";

// 검색어에 해당하는 판매 제품의 브랜드(제조사) 목록만 집계해 반환합니다.
export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  try {
    const session = await auth();
    if (!session?.user?.email) return reply({ error: "로그인 후 브랜드 검색을 이용해주세요." }, 401);
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().replace(/\s+/g, " ");
    if (query.length < 1 || query.length > 40) {
      return reply({ error: "음식명은 1~40자로 입력해주세요." }, 400);
    }
    return reply(await searchPublicFoodBrands(query));
  } catch (error) {
    if (error instanceof FoodSearchError) return reply({ error: error.message }, error.status);
    return reply({ error: "브랜드 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }, 500);
  }
}
