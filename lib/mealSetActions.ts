"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTodayDate, isValidMealDate } from "@/lib/mealNutrition";
import { applyMealSet, deleteMealSet, isMealSetScope, MealSetError, saveMealSet } from "@/lib/mealSets";

const text = (form: FormData, name: string) => { const value = form.get(name); return typeof value === "string" ? value.trim() : ""; };
function returnDate(form: FormData) { const date = text(form, "date"); return isValidMealDate(date) ? date : getTodayDate(); }
function failure(error: unknown, date: string): never {
  const code = error instanceof MealSetError ? error.code : "set-database";
  // 접속 주소·계정 정보 대신 오류 종류만 로그에 남깁니다.
  if (!(error instanceof MealSetError)) console.error("식사 세트 처리 실패:", error instanceof Error ? error.name : "UnknownError");
  redirect(`/meals?date=${date}&error=${code}`);
}

// 모든 세트 작업은 세션에서 소유자를 확인하며 폼의 userId는 사용하지 않습니다.
export async function saveMealSetAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/meals");
  const date = returnDate(form);
  const scope = text(form, "scope");
  if (!isValidMealDate(text(form, "date")) || !isMealSetScope(scope)) redirect(`/meals?date=${date}&error=set-input`);
  try { await saveMealSet(user.id, date, scope, text(form, "name")); } catch (error) { failure(error, date); }
  revalidatePath("/meals");
  redirect(`/meals?date=${date}&notice=set-saved`);
}

export async function applyMealSetAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/meals");
  const date = returnDate(form);
  if (!isValidMealDate(text(form, "date"))) redirect(`/meals?date=${date}&error=set-input`);
  try { await applyMealSet(user.id, text(form, "setId"), date, text(form, "mealType")); } catch (error) { failure(error, date); }
  revalidatePath("/meals");
  revalidatePath("/meals/stats");
  redirect(`/meals?date=${date}&notice=set-applied`);
}

export async function deleteMealSetAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/meals");
  const date = returnDate(form);
  try { await deleteMealSet(user.id, text(form, "setId")); } catch (error) { failure(error, date); }
  revalidatePath("/meals");
  redirect(`/meals?date=${date}&notice=set-deleted`);
}
