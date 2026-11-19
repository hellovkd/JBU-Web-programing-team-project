// 장식용 뼈대 카드 대신 조회 중이라는 상태만 간단하게 안내합니다.
export default function Loading() {
  return (
    <main id="main" className="content-shell" aria-busy="true">
      <div className="page-heading">
        <h1>대시보드</h1>
        <p role="status">오늘의 요약 정보를 불러오는 중입니다…</p>
      </div>
    </main>
  );
}
