import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getMealRecords, type SavedMealRecord } from "@/lib/meals";
import { isValidMealDate, mealTypes, sumNutrition, type Nutrients } from "@/lib/mealNutrition";
import { MealRecord } from "@/models/MealRecord";

export type MealStatDays = 1 | 7 | 30;

type DailyTotals = Nutrients & { _id: string; count: number };

export type MealStatEntry = {
  date: string;
  nutrients: Nutrients | null;
  count: number;
};

type MealTypeBreakdown = {
  mealType: keyof typeof mealTypes;
  label: string;
  count: number;
  nutrients: Nutrients;
};

export type MealStatsBundle = {
  days: MealStatDays;
  anchorDate: string;
  startDate: string;
  entries: MealStatEntry[];
  dayRecords: SavedMealRecord[];
  dayBreakdown: MealTypeBreakdown[];
};

function buildDateRange(days: MealStatDays, anchorDate: string): string[] {
  const end = new Date(`${anchorDate}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - (days - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

export async function getMealStatsBundle(
  userId: string,
  days: MealStatDays,
  anchorDate: string,
): Promise<MealStatsBundle> {
  if (!isValidMealDate(anchorDate)) throw new Error("통계 기준 날짜를 확인해주세요.");

  const dates = buildDateRange(days, anchorDate);
  const startDate = dates[0];

  await connectDB();
  // 저장된 끼니별 섭취량을 원본 정밀도로 합산하고 선택한 기간의 본인 자료만 읽습니다.
  const [results, dayRecords] = await Promise.all([
    MealRecord.aggregate<DailyTotals>([
      { $match: { userId: new Types.ObjectId(userId), date: { $gte: startDate, $lte: anchorDate } } },
      {
        $group: {
          _id: "$date",
          calories: { $sum: "$totals.calories" },
          carbs: { $sum: "$totals.carbs" },
          protein: { $sum: "$totals.protein" },
          fat: { $sum: "$totals.fat" },
          count: { $sum: 1 },
        },
      },
    ]),
    getMealRecords(userId, anchorDate),
  ]);

  const totalsMap = new Map(
    results.map(({ _id, count, calories, carbs, protein, fat }) => [
      _id,
      { count, nutrients: { calories, carbs, protein, fat } },
    ]),
  );

  // 기록이 없는 날짜는 null로 남겨 실제 섭취량이 0인 날짜와 구분합니다.
  const entries: MealStatEntry[] = dates.map((date) => {
    const item = totalsMap.get(date);
    return item
      ? { date, nutrients: item.nutrients, count: item.count }
      : { date, nutrients: null, count: 0 };
  });

  const dayBreakdown: MealTypeBreakdown[] = (Object.entries(mealTypes) as Array<[keyof typeof mealTypes, string]>).map(
    ([mealType, label]) => {
      const matched = dayRecords.filter((record) => record.mealType === mealType);
      return {
        mealType,
        label,
        count: matched.length,
        nutrients: sumNutrition(matched.map((record) => record.totals)),
      };
    },
  );

  return {
    days,
    anchorDate,
    startDate,
    entries,
    dayRecords,
    dayBreakdown,
  };
}
