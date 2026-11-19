import { redirect } from "next/navigation";
import { GymWorld } from "@/components/GymWorld";
import { getCurrentUser } from "@/lib/session";

// 로그인 사용자는 기존 기록 화면으로 보내고 방문자에게 3D 입장 장면을 보여줍니다.
export default async function Home() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("프로필 조회 실패:", error instanceof Error ? error.name : "UnknownError");
  }
  if (user) redirect("/dashboard");

  return (
    <main id="main" className="world-home">
      <h1 className="world-title">곰 코치의 운동 공간</h1>
      <GymWorld />
    </main>
  );
}
