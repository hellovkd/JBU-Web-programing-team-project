"use client";

import Link from "next/link";

// Next.js 16 오류 경계의 retry 콜백으로 통계 조회를 재시도합니다.
export default function MealStatsError({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="content-shell">
      <div className="page-heading"><h1>식단 통계</h1></div>
      <section className="surface-panel empty-state">
        <h2>식단 통계를 불러오지 못했습니다.</h2>
        <p>연결 상태를 확인한 뒤 다시 시도해주세요.</p>
        <button className="secondary-button" onClick={retry}>다시 시도하기</button>
        <Link href="/meals" className="text-link">식단 기록으로 돌아가기</Link>
      </section>
    </main>
  );
}
