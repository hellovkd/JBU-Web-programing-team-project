import Link from "next/link";
import { redirect } from "next/navigation";
import { FoodRegistration } from "@/components/FoodRegistration";
import { getCurrentUser } from "@/lib/session";
import { getFavoriteFoods } from "@/lib/favoriteFoods";
import { foodUnits, nutrientFields } from "@/lib/mealNutrition";

type Props = { searchParams: Promise<{ error?: string; notice?: string; q?: string }> };
export const metadata = { title: "내 음식" };
export const dynamic = "force-dynamic";

// 음식의 기준량·단위와 영양정보를 함께 저장하고 본인 음식 목록을 조회합니다.
export default async function FoodsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/foods");
  const { error, notice, q } = await searchParams;
  const initialQuery = typeof q === "string" ? q.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  const foods = await getFavoriteFoods(user.id);
  const display = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  return (
    <main id="main" className="content-shell">
      {/* 제목과 식단 연결만 두어 음식 등록·목록에 바로 집중할 수 있게 합니다. */}
      <div className="page-heading heading-with-action">
        <div>
          <h1>내 음식</h1>
          <p>공공 식품 DB에서 제품과 브랜드를 찾아 등록하거나 직접 입력해 식단에 빠르게 추가하세요.</p>
        </div>
        <div className="meal-page-links">
          <Link href="/meals" className="text-link">식단 기록</Link>
          <Link href="/meals/stats" className="text-link">식단 통계</Link>
        </div>
      </div>
      {error ? <p className="notice error-notice" role="alert">{error === "input" ? "음식 이름, 기준량·단위와 영양정보를 확인해주세요." : "음식을 저장하지 못했습니다. 다시 시도해주세요."}</p> : null}
      {notice ? <p className="notice info-notice" role="status">음식을 저장했습니다.</p> : null}
      {/* 검색 가능 여부와 초기 검색어만 전달하고 저장한 음식 목록은 서버에서 그립니다. */}
      <FoodRegistration searchAvailable={Boolean(process.env.FOOD_NUTRITION_API_KEY?.trim())} initialQuery={initialQuery}>
        <section className="food-list-section" aria-labelledby="food-list-heading">
          <div className="section-heading"><h2 id="food-list-heading">저장한 음식</h2><span>{foods.length}개</span></div>
          {foods.length ? <ul className="food-list">{foods.map((food) => (
            <li key={food.id} className="surface-panel food-card">
              <div className="food-card-heading"><h3>{food.name}</h3><span>{display(food.baseAmount)} {foodUnits[food.unit]} 기준</span></div>
              <dl className="meal-record-nutrients">
                {nutrientFields.map(({ key, label, unit }) => (
                  <div key={key}><dt>{label}</dt><dd>{display(food.nutrients[key])} {unit}</dd></div>
                ))}
              </dl>
            </li>
          ))}</ul> : <div className="surface-panel empty-state"><p>저장한 음식이 없습니다.</p></div>}
        </section>
      </FoodRegistration>
    </main>
  );
}
