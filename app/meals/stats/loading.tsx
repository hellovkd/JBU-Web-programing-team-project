// 조회 중 상태만 간결하게 안내합니다.
export default function MealStatsLoading() {
  return (
    <main id="main" className="content-shell" aria-busy="true">
      <div className="page-heading">
        <h1>식단 통계</h1>
        <p role="status">날짜별 식단 기록과 통계를 불러오는 중입니다…</p>
      </div>
    </main>
  );
}
