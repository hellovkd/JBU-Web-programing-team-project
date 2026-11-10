import { connectDB } from "@/lib/mongodb";
import { getMealRecords } from "@/lib/meals";
import { calculateMealNutrition, isValidMealDate, mealTypes, validateMealInput, type MealInput } from "@/lib/mealNutrition";
import { MealSet } from "@/models/MealSet";
import { MealRecord } from "@/models/MealRecord";

export type MealSetScope = "day" | MealInput["mealType"];
export type MealSetItem = Omit<MealInput, "date">;
export type SavedMealSet = { id: string; name: string; scope: MealSetScope; items: MealSetItem[] };
export class MealSetError extends Error {
  constructor(public code: string) { super(code); }
}
export function isMealSetScope(scope: string): scope is MealSetScope { return scope === "day" || Object.hasOwn(mealTypes, scope); }

// 날짜·소유자 등 내부 필드를 제외하고 세트 재사용에 필요한 음식 정보만 복사합니다.
function snapshot(item: MealSetItem): MealSetItem {
  return { name: item.name, baseAmount: item.baseAmount, unit: item.unit, amount: item.amount, mealType: item.mealType,
    nutrients: { calories: item.nutrients.calories, carbs: item.nutrients.carbs, protein: item.nutrients.protein, fat: item.nutrients.fat } };
}

export async function getMealSets(userId: string): Promise<SavedMealSet[]> {
  await connectDB();
  const sets = await MealSet.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(50).lean();
  return sets.map((set) => ({ id: String(set._id), name: set.name, scope: set.scope as MealSetScope, items: set.items.map((item) => snapshot(item as MealSetItem)) }));
}

export async function saveMealSet(userId: string, date: string, scope: MealSetScope, name: string) {
  if (!isValidMealDate(date) || !isMealSetScope(scope) || !name.trim() || name.trim().length > 60) throw new MealSetError("set-input");
  // 클라이언트가 보낸 음식 목록은 받지 않고 본인이 저장한 날짜별 식사를 서버에서 조회합니다.
  const records = await getMealRecords(userId, date);
  const selected = scope === "day" ? records : records.filter((item) => item.mealType === scope);
  if (!selected.length) throw new MealSetError("set-empty");
  if (selected.length > 30) throw new MealSetError("set-size");
  const items = selected.map(snapshot);
  if (items.some((item) => validateMealInput({ ...item, date }))) throw new MealSetError("set-input");
  if (await MealSet.countDocuments({ userId }) >= 50) throw new MealSetError("set-limit");
  await MealSet.init();
  try { await MealSet.create({ userId, name: name.trim(), scope, items }); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new MealSetError("set-duplicate");
    throw error;
  }
}

export async function applyMealSet(userId: string, id: string, date: string, mealType: string) {
  if (!/^[a-f\d]{24}$/i.test(id) || !isValidMealDate(date)) throw new MealSetError("set-input");
  await connectDB();
  const set = await MealSet.findOne({ _id: id, userId }).lean();
  if (!set) throw new MealSetError("set-missing");
  if (set.scope !== "day" && !Object.hasOwn(mealTypes, mealType)) throw new MealSetError("set-input");
  if (!set.items.length || set.items.length > 30) throw new MealSetError("set-input");
  const inputs = set.items.map((item) => ({ ...snapshot(item as MealSetItem), date, mealType: set.scope === "day" ? item.mealType as MealInput["mealType"] : mealType as MealInput["mealType"] }));
  if (inputs.some((item) => validateMealInput(item))) throw new MealSetError("set-input");
  const documents = inputs.map((input) => ({ ...input, userId, totals: calculateMealNutrition(input) }));
  // 여러 음식 중 일부만 기록되지 않도록 한 트랜잭션으로 추가하며 기존 식사는 수정하지 않습니다.
  await MealRecord.db.transaction(async (session) => { await MealRecord.insertMany(documents, { session }); });
}

export async function deleteMealSet(userId: string, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new MealSetError("set-input");
  await connectDB();
  const result = await MealSet.deleteOne({ _id: id, userId });
  if (!result.deletedCount) throw new MealSetError("set-missing");
}
