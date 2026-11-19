import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator } from "@/components/Calculator";
import { CoachBanner } from "@/components/CoachBear";
import { TargetIcon } from "@/components/Icons";
import { getGoalsCoachComment } from "@/lib/coachTips";
import { goals } from "@/lib/macroCalculator";
import { getMacroRecords } from "@/lib/macroRecords";
import { getCurrentUser } from "@/lib/session";

type Props = { searchParams: Promise<{ error?: string; notice?: string }> };
export const metadata = { title: "목표 설정" };
export const dynamic = "force-dynamic";

// 신체 정보와 목표를 수정·계산하고 저장한 목표 이력을 조회합니다.
export default async function GoalsPage({ searchParams }: Props) {
  const { error, notice } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/goals");

  const records = await getMacroRecords(user.id);
  const latest = records[0];
  const initial = latest ?? user.bodySpec;
  const oldest = records.at(-1);
  const change =
    latest && oldest && records.length > 1
      ? Number((latest.weight - oldest.weight).toFixed(1))
      : null;

  const coachMessage = getGoalsCoachComment({
    goal: latest?.goal ?? user.bodySpec?.goal,
    targetCalories: latest?.targetCalories,
    protein: latest?.protein,
    change,
  });

  return (
    <main id="main" className="content-shell">
      <div className="page-heading">
        <div className="page-heading-title">
          <span className="page-heading-icon">
            <TargetIcon size={20} />
          </span>
          <h1>목표 설정</h1>
        </div>
        <p>신체 정보와 활동량·목표를 설정해 하루 권장 칼로리와 탄단지 비율을 계산하고 이력을 관리하세요.</p>
      </div>

      {notice === "updated" ? (
        <p className="notice info-notice" role="status">
          신체 정보와 목표를 수정해 다시 계산했습니다.
        </p>
      ) : null}
      {notice === "record-retry" ? (
        <p className="notice warning-notice" role="status">
          회원가입은 완료됐지만 첫 계산 기록을 저장하지 못했습니다. 아래 정보를 확인하고 다시 저장해주세요.
        </p>
      ) : null}
      {error ? (
        <p className="notice error-notice" role="alert">
          {error === "save"
            ? "기록을 저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요."
            : error === "infeasible"
              ? "입력한 조건에서는 탄단지 배분을 계산할 수 없습니다. 체중과 목표를 다시 확인해주세요."
              : "입력값과 목표를 확인한 뒤 다시 저장해주세요."}
        </p>
      ) : null}

      <CoachBanner
        badge={latest ? goals[latest.goal].label : "목표 가이드"}
        message={coachMessage}
      />

      <Calculator initial={initial} />
      <p className="form-note">성인용 추정값이며 실제 필요량과 다를 수 있습니다.</p>

      <dl className="dashboard-summary surface-panel">
        <div>
          <dt>최근 저장 체중</dt>
          <dd>
            {latest ? latest.weight : "—"}
            <span>kg</span>
          </dd>
        </div>
        <div>
          <dt>최근 목표 칼로리</dt>
          <dd>
            {latest ? latest.targetCalories.toLocaleString("ko-KR") : "—"}
            <span>kcal</span>
          </dd>
          {latest ? <p>{goals[latest.goal].label}</p> : null}
        </div>
        <div>
          <dt>표시 기간 체중 변화</dt>
          <dd>
            {change === null ? "—" : `${change > 0 ? "+" : ""}${change}`}
            <span>kg</span>
          </dd>
          <p>
            {records.length > 1
              ? `표시된 ${records.length}개 기록의 처음과 최근 비교`
              : "기록 2개부터 비교합니다"}
          </p>
        </div>
      </dl>

      <section className="records-section" aria-labelledby="records-heading">
        <div className="section-heading">
          <h2 id="records-heading">저장한 계산</h2>
          <span>최근 100개 중 {records.length}개</span>
        </div>
        {records.length ? (
          <div className="record-table-scroll" tabIndex={0} role="region" aria-label="저장한 계산 기록 표">
            <table className="record-table">
              <thead>
                <tr>
                  <th scope="col">저장일</th>
                  <th scope="col">목표</th>
                  <th scope="col">체중 (kg)</th>
                  <th scope="col">목표 칼로리 (kcal)</th>
                  <th scope="col">탄수화물 (g)</th>
                  <th scope="col">단백질 (g)</th>
                  <th scope="col">지방 (g)</th>
                  <th scope="col">상세</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <time dateTime={record.createdAt}>
                        {new Date(record.createdAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </td>
                    <td>{goals[record.goal].label}</td>
                    <td>{record.weight}</td>
                    <td>{record.targetCalories.toLocaleString("ko-KR")}</td>
                    <td>{record.carbs}</td>
                    <td>{record.protein}</td>
                    <td>{record.fat}</td>
                    <td>
                      <Link className="text-link" href={`/goals/${record.id}`}>
                        보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state surface-panel">
            <p>저장한 계산 기록이 없습니다.</p>
          </div>
        )}
      </section>
    </main>
  );
}
