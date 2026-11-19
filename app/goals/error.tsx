"use client";

import Link from "next/link";

// Next.js 16 오류 경계의 retry 콜백으로 목표 설정 조회를 재시도합니다.
export default function GoalsError({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="content-shell">
      <div className="page-heading">
        <h1>목표 설정</h1>
      </div>
      <section className="surface-panel empty-state">
        <h2>목표 기록을 불러오지 못했습니다.</h2>
        <p>연결 상태를 확인한 뒤 다시 시도해주세요.</p>
        <button className="secondary-button" onClick={retry}>
          다시 시도하기
        </button>
        <Link href="/dashboard" className="text-link">
          대시보드로 돌아가기
        </Link>
      </section>
    </main>
  );
}
