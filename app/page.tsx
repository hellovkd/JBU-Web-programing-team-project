import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// 계산기는 계산 기록 화면으로 옮겼으므로, 로그인한 사용자는 그곳으로 이동시키고 비로그인은 가입 안내만 보여줍니다.
export default async function Home() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error(
      "프로필 조회 실패:",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
  if (user) redirect("/dashboard");

  return (
    <main id="main" className="content-shell home-shell">
      {/* 처음 방문한 사용자에게 실제 서비스의 가입과 기록 흐름을 소개합니다. */}
      <section className="home-intro" aria-labelledby="home-heading">
        <div className="home-intro-main">
          <p className="home-kicker">나를 위한 식사 기록</p>
          <h1 id="home-heading">잘 먹는 하루는<br />기록에서 시작해요.</h1>
          <p className="home-description">내 몸에 맞는 하루 목표를 확인하고, 매일의 식사를 차분히 기록해 보세요.</p>
          <div className="home-actions">
            <Link className="primary-button" href="/register">시작하기</Link>
            <Link className="home-login" href="/login">이미 계정이 있나요? 로그인</Link>
          </div>
        </div>
        <aside className="home-aside" aria-label="서비스 안내">
          <p>식사를 바라보는<br />나만의 기준을 만듭니다.</p>
          <span>CALORIES / CARBS / PROTEIN / FAT</span>
        </aside>
      </section>
      <section className="home-guide" aria-labelledby="guide-heading">
        <div className="home-guide-title"><p className="home-kicker">탄단지 사용법</p><h2 id="guide-heading">내 식사를 알아가는 방법</h2></div>
        <div className="home-guide-list">
          <div><span>01</span><h3>나에게 맞는 목표</h3><p>신체 정보와 활동량을 입력하면 하루 권장 칼로리와 영양소를 계산해요.</p></div>
          <div><span>02</span><h3>매일의 식사 기록</h3><p>먹은 음식과 양을 기록하고, 하루 동안 섭취한 영양소를 확인해요.</p></div>
          <div><span>03</span><h3>변화 확인하기</h3><p>목표와 신체 정보가 달라지면 다시 계산하고 이전 기록과 비교해요.</p></div>
        </div>
      </section>
      <p className="home-footnote">표시되는 칼로리와 영양소는 입력 정보를 바탕으로 한 추정값입니다.</p>
    </main>
  );
}
