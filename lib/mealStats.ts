import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { isValidMealDate, type Nutrients } from "@/lib/mealNutrition";
import { MealRecord } from "@/models/MealRecord";

export type MealStatDays = 7 | 30;

type DailyTotals = Nutrients & { _id: string };

export type MealStatEntry = {
  date: string;
  nutrients: Nutrients | null;
};

export async function getMealStats(userId: string, days: MealStatDays, today: string): Promise<MealStatEntry[]> {
  if (!isValidMealDate(today)) throw new Error("통계 기준 날짜를 확인해주세요.");

  // 이미 확정한 한국 달력 날짜에서 일을 거슬러 올라가 월과 연도 경계를 처리합니다.
  const end = new Date(`${today}T00:00:00.000Z`);
  const dates = Array.from({ length: days }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - (days - 1 - index));
    return day.toISOString().slice(0, 10);
  });

  await connectDB();
  // 저장된 끼니별 섭취량을 원본 정밀도로 합산하고 선택한 기간의 본인 자료만 읽습니다.
  const results = await MealRecord.aggregate<DailyTotals>([
    { $match: { userId: new Types.ObjectId(userId), date: { $gte: dates[0], $lte: today } } },
    {
      $group: {
        _id: "$date",
        calories: { $sum: "$totals.calories" },
        carbs: { $sum: "$totals.carbs" },
        protein: { $sum: "$totals.protein" },
        fat: { $sum: "$totals.fat" },
      },
    },
  ]);
  const totals = new Map(results.map(({ _id, ...nutrients }) => [_id, nutrients]));

  // 기록이 없는 날짜는 null로 남겨 실제 섭취량이 0인 날짜와 구분합니다.
  return dates.map((date) => ({ date, nutrients: totals.get(date) ?? null }));
}
