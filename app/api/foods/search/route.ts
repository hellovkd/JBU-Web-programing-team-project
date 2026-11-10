import { auth } from "@/auth";
import { FoodSearchError, searchPublicFoods } from "@/lib/foodNutritionApi";

export const runtime = "nodejs";

// 인증키를 서버에 보관하고 로그인한 사용자의 명시적인 검색만 중계합니다.
export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  try {
    const session = await auth();
    if (!session?.user?.email) return reply({ error: "로그인 후 음식 검색을 이용해주세요." }, 401);
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().replace(/\s+/g, " ");
    const pageText = params.get("page") ?? "1";
    const page = Number(pageText);
    if (query.length < 2 || query.length > 40 || !/^\d{1,3}$/.test(pageText) || !Number.isInteger(page) || page < 1 || page > 100) {
      return reply({ error: "음식명은 2~40자로, 검색 페이지는 1~100으로 입력해주세요." }, 400);
    }
    return reply(await searchPublicFoods(query, page));
  } catch (error) {
    if (error instanceof FoodSearchError) return reply({ error: error.message }, error.status);
    return reply({ error: "음식 검색을 처리하지 못했습니다. 잠시 후 다시 시도해주세요." }, 500);
  }
}
