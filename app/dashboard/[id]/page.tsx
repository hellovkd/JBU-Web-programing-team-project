import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

// 이전 계산 상세 경로(/dashboard/[id])를 새 목표 설정 상세 경로(/goals/[id])로 안내합니다.
export default async function LegacyDashboardDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/goals/${encodeURIComponent(id)}`);
}
