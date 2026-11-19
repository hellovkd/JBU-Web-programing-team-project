"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { createUser } from "@/lib/users";
import { getCurrentUser } from "@/lib/session";
import { createMacroRecord } from "@/lib/macroRecords";
import {
  readMacroInput,
  validateMacroInput,
  calculateMacros,
} from "@/lib/macroCalculator";
import {
  normalizeEmail,
  validEmail,
  validPassword,
  safeReturnTo,
} from "@/lib/authValidation";
import { authenticationConfigured } from "@/lib/config";

// 로그인한 사용자가 신체 정보와 목표를 수정하면 서버에서 다시 계산해 새 기록으로 저장합니다.
export async function saveMacroRecordAction(formData: FormData) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/goals?error=save");
  }
  if (!user) redirect("/login?notice=auth&next=/goals");
  const input = readMacroInput(formData);
  if (Object.keys(validateMacroInput(input)).length) redirect("/goals?error=input");
  if (!calculateMacros(input).isFeasible) redirect("/goals?error=infeasible");
  try {
    await createMacroRecord(user.id, input);
  } catch (error) {
    console.error(
      "기록 저장 실패:",
      error instanceof Error ? error.name : "UnknownError",
    );
    redirect("/goals?error=save");
  }
  // 수정된 입력과 재계산 결과가 홈, 대시보드, 목표 설정, 식단·통계 목표치에 즉시 반영되도록 재검증합니다.
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/meals");
  revalidatePath("/meals/stats");
  redirect("/goals?notice=updated");
}

export async function registerAction(formData: FormData) {
  if (!authenticationConfigured()) redirect("/register?error=config");
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  const bodySpec = readMacroInput(formData);
  if (
    !name ||
    name.length > 50 ||
    !validEmail(email) ||
    !validPassword(password) ||
    Object.keys(validateMacroInput(bodySpec)).length
  )
    redirect("/register?error=input");
  // 회원가입 시점에만 최초 탄단지 계산을 수행하므로 배분 가능한 조건인지 함께 검증합니다.
  if (!calculateMacros(bodySpec).isFeasible)
    redirect("/register?error=infeasible");
  let user;
  try {
    // 계정 생성과 첫 기록 저장의 실패를 구분해 생성된 계정을 다시 가입하라고 안내하지 않습니다.
    user = await createUser({ name, email, password, bodySpec });
  } catch (error) {
    const duplicate =
      error instanceof Error &&
      (error.message === "이미 가입된 이메일입니다." ||
        ("code" in error && error.code === 11000));
    redirect(`/register?error=${duplicate ? "duplicate" : "database"}`);
  }
  let initialRecordSaved = true;
  try {
    await createMacroRecord(user.id, bodySpec);
  } catch (error) {
    initialRecordSaved = false;
    console.error("초기 계산 기록 저장 실패:", error instanceof Error ? error.name : "UnknownError");
  }
  try {
    await signIn("credentials", { email, password, redirectTo: initialRecordSaved ? "/dashboard" : "/goals?notice=record-retry" });
  } catch (error) {
    if (error instanceof AuthError) redirect(initialRecordSaved ? "/login?notice=registered" : "/login?notice=registered-record-retry");
    throw error;
  }
}

export async function loginAction(formData: FormData) {
  const next = safeReturnTo(formData.get("next"));
  if (!authenticationConfigured())
    redirect(`/login?error=config&next=${encodeURIComponent(next)}`);
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  if (!validEmail(email) || !validPassword(password))
    redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (error instanceof AuthError)
      redirect(
        `/login?error=${error.type === "CredentialsSignin" ? "credentials" : "database"}&next=${encodeURIComponent(next)}`,
      );
    throw error;
  }
}

// Auth.js signOut으로 세션을 해제하고 계산기로 이동합니다.
export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
