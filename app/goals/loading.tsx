// 조회 중 상태만 간단하게 안내합니다.
export default function GoalsLoading() {
  return (
    <main id="main" className="content-shell" aria-busy="true">
      <div className="page-heading">
        <h1>목표 설정</h1>
        <p role="status">저장한 목표 계산을 불러오는 중입니다…</p>
      </div>
    </main>
  );
}
