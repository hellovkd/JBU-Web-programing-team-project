import type { goals } from "@/lib/macroCalculator";
import { formatNumber as display, type Nutrients } from "@/lib/mealNutrition";

type Goal = keyof typeof goals;

export type CoachTipCategory = "macro" | "diet" | "workout" | "shopping";

type CoachTip = {
  id: string;
  category: CoachTipCategory;
  route: "/dashboard" | "/meals" | "/meals/stats" | "/foods" | "/goals";
  title: string;
  body: string;
};

export const COACH_TIP_CATEGORIES: Record<CoachTipCategory, string> = {
  macro: "식단·탄단지",
  diet: "체중 관리",
  workout: "운동·대사량",
  shopping: "장보기·브랜드",
};

export const COACH_TIPS: readonly CoachTip[] = [
  {
    id: "macro-protein-spread",
    category: "macro",
    route: "/meals",
    title: "단백질은 세 끼에 나눠 먹어요",
    body: "한 끼에 단백질을 몰아 먹기보다 아침·점심·저녁에 20~35g씩 고르게 나누면 포만감과 근합성 효율이 훨씬 좋습니다.",
  },
  {
    id: "macro-brown-rice",
    category: "macro",
    route: "/meals",
    title: "흰쌀밥 대신 현미·잡곡밥 조합",
    body: "같은 탄수화물이라도 현미밥이나 귀리밥은 식이섬유가 풍부해 식후 혈당 변동을 완만하게 유지해 줍니다.",
  },
  {
    id: "macro-healthy-fat",
    category: "macro",
    route: "/dashboard",
    title: "지방도 하루 최소량은 꼭 챙겨요",
    body: "지방 섭취가 지나치게 낮아지면 호르몬 균형과 지용성 비타민 흡수가 떨어집니다. 아몬드·올리브유 등으로 적정선을 맞춰보세요.",
  },
  {
    id: "macro-evening-adjust",
    category: "macro",
    route: "/meals",
    title: "저녁 식단은 부족한 영양소 위주로",
    body: "점심까지 탄수화물을 많이 드셨다면 저녁에는 닭가슴살·두부·채소처럼 단백질과 식이섬유 비중을 높여 하루 균형을 맞춰요.",
  },
  {
    id: "diet-7day-average",
    category: "diet",
    route: "/meals/stats",
    title: "하루 오차보다 7일 평균을 보세요",
    body: "하루 목표보다 조금 더 먹은 날이 있어도 7일 평균 칼로리가 목표치 근처라면 체중 감량·유지 흐름은 흔들리지 않습니다.",
  },
  {
    id: "diet-hydration",
    category: "diet",
    route: "/dashboard",
    title: "가짜 배고픔과 물 한 잔",
    body: "식사 후 2시간 내에 출출할 때는 먼저 물 한 컵을 마셔보세요. 수분 부족을 허기로 착각하는 경우가 꽤 많아요.",
  },
  {
    id: "diet-consistency",
    category: "diet",
    route: "/meals/stats",
    title: "완벽한 하루보다 꾸준한 기록",
    body: "음식을 대략이라도 빠짐없이 기록하는 습관이 식단 관리 성공의 80%입니다. 빈 날짜가 있어도 오늘부터 바로 이어가세요.",
  },
  {
    id: "diet-meal-sets",
    category: "diet",
    route: "/meals",
    title: "자주 먹는 조합은 식사 세트로 저장",
    body: "아침 루틴이나 고정 도시락이 있다면 한 끼 세트로 묶어두세요. 다음 날 클릭 한 번으로 1초 만에 기록할 수 있어요.",
  },
  {
    id: "workout-protein-timing",
    category: "workout",
    route: "/goals",
    title: "근력 운동일에는 탄수화물도 함께",
    body: "운동 전후로 적당한 복합 탄수화물과 단백질을 함께 챙겨주면 운동 수행력과 근육 회복 속도가 함께 올라갑니다.",
  },
  {
    id: "workout-neat",
    category: "workout",
    route: "/goals",
    title: "활동량(NEAT)이 TDEE를 좌우해요",
    body: "헬스장 1시간 운동만큼 평소 걸음 수와 계단 오르기 같은 일상 활동량이 하루 소비 칼로리에 큰 비중을 차지합니다.",
  },
  {
    id: "workout-weight-trend",
    category: "workout",
    route: "/goals",
    title: "체중 변화는 2주 주기로 목표 수정",
    body: "수분과 염분에 따라 하루 체중은 1~2kg씩 오르내립니다. 최근 2주간 추이를 보고 목표 설정에서 체중과 활동량을 업데이트하세요.",
  },
  {
    id: "workout-deficit-limit",
    category: "workout",
    route: "/goals",
    title: "감량 시 기초대사량 아래는 주의",
    body: "칼로리를 너무 급격히 줄이면 근손실과 피로가 빠르게 옵니다. 기초대사량(BMR) 이상을 유지하면서 천천히 감량하는 것이 안전해요.",
  },
  {
    id: "shopping-brand-compare",
    category: "shopping",
    route: "/foods",
    title: "브랜드별로 나트륨·당류·중량이 달라요",
    body: "같은 현미밥·닭가슴살이라도 브랜드마다 1회 제공량(130g~210g)과 칼로리가 다릅니다. 내 음식 검색에서 브랜드칩을 눌러 비교해 보세요.",
  },
  {
    id: "shopping-basis-check",
    category: "shopping",
    route: "/foods",
    title: "영양표의 ‘100g 기준’과 ‘총 내용량’ 구분",
    body: "시판 제품 뒷면 표기는 100g 기준인 경우가 많아요. 공공데이터 적용 후 기준량(100g vs 210g)을 한 번만 확인해 저장하면 정확도가 확 올라갑니다.",
  },
  {
    id: "shopping-snack-swap",
    category: "shopping",
    route: "/foods",
    title: "단백질 간식을 내 음식에 미리 등록",
    body: "무가당 그릭요거트, 구운 달걀, 아몬드 등 즐겨 먹는 간식을 내 음식에 등록해 두면 부족 영양소 추천에 바로 뜹니다.",
  },
  {
    id: "shopping-liquid-ml",
    category: "shopping",
    route: "/foods",
    title: "음료·유제품은 mL 단위로 정확하게",
    body: "두유나 단백질 음료는 g 대신 mL 부피 기준으로 제공되는 경우가 많아요. 단위만 맞춰 기록하면 오차 없이 계산됩니다.",
  },
];

export function getDashboardCoachBriefing({
  userName,
  consumed,
  target,
  mealCount,
  recordedDays7,
  goalLabel,
}: {
  userName: string;
  consumed: Nutrients;
  target?: Nutrients;
  mealCount: number;
  recordedDays7: number;
  goalLabel?: string;
}): { headline: string; message: string; tag: string } {
  if (!target || target.calories <= 0) {
    return {
      headline: `${userName}님, 먼저 하루 목표 칼로리부터 정해볼까요?`,
      message: "신체 정보와 목표를 저장하면 오늘 얼마나 더 먹어야 할지 제가 바로 계산해서 알려드릴게요.",
      tag: "목표 설정 필요",
    };
  }

  if (mealCount === 0) {
    const streakNote =
      recordedDays7 > 0
        ? `최근 7일 중 ${recordedDays7}일을 꾸준히 기록하셨네요!`
        : "오늘 첫 끼니를 기록하면 부족한 영양소를 바로 계산해 드려요.";
    return {
      headline: `${userName}님, 오늘 목표 ${display(target.calories)} kcal 준비 완료!`,
      message: `${streakNote} ${goalLabel ? `현재 '${goalLabel}' 목표 기준으로 ` : ""}단백질 ${display(target.protein)} g을 챙겨보세요.`,
      tag: goalLabel ?? "오늘의 코칭",
    };
  }

  const calDiff = target.calories - consumed.calories;
  const proteinRest = target.protein - consumed.protein;

  if (calDiff < -80) {
    return {
      headline: `오늘 목표보다 ${display(Math.abs(calDiff))} kcal 여유를 넘겼어요`,
      message: "하루쯤 넘겨도 괜찮아요! 내일은 가벼운 단백질·채소 위주 식사로 7일 평균을 부드럽게 맞춰봅시다.",
      tag: "페이스 조절",
    };
  }

  if (proteinRest > 15 && calDiff > 120) {
    return {
      headline: `단백질 ${display(proteinRest)} g만 더 채우면 오늘 밸런스 최고예요!`,
      message: `지금까지 ${display(consumed.calories)} kcal를 섭취했어요. 남은 ${display(calDiff)} kcal 안에서 아래 추천 음식을 골라보세요.`,
      tag: "단백질 보충",
    };
  }

  if (calDiff <= 150 && calDiff >= -80) {
    return {
      headline: `${userName}님, 오늘 목표 칼로리에 딱 맞게 도착했어요!`,
      message: `총 ${mealCount}개 음식으로 ${display(consumed.calories)} kcal를 균형 있게 채우셨습니다. 오늘 식단 관리 아주 훌륭해요.`,
      tag: "목표 달성",
    };
  }

  return {
    headline: `오늘 목표까지 ${display(calDiff)} kcal 남아 있어요`,
    message: `현재 ${display(consumed.calories)} kcal를 기록했어요. 아래 부족영양소 카드를 눌러 남은 열량에 맞는 음식을 확인해 보세요.`,
    tag: `${recordedDays7}/7일 기록 중`,
  };
}

export function getMealsCoachMessage({
  hasTarget,
  hasMealRecords,
  priorityLabel,
  priorityRemaining,
  priorityUnit,
  remainingCalories,
}: {
  hasTarget: boolean;
  hasMealRecords: boolean;
  priorityLabel?: string;
  priorityRemaining: number;
  priorityUnit?: string;
  remainingCalories: number;
}): string {
  if (!hasTarget) {
    return "아직 하루 목표가 설정되지 않았어요. 목표 설정에서 신체 정보를 저장하면 부족한 영양소와 추천 분량을 딱 맞춰드릴게요!";
  }
  if (remainingCalories <= 15) {
    return "오늘 목표 칼로리를 모두 채우셨어요! 추가 간식이 필요하다면 물이나 가벼운 채소로 포만감만 챙겨주세요.";
  }
  if (!priorityLabel) {
    return "탄수화물·단백질·지방이 모두 균형 있게 채워졌어요. 이 페이스를 그대로 유지해 보세요!";
  }
  if (!hasMealRecords) {
    return `아직 오늘 기록이 없네요! 첫 식사는 부족한 ${priorityLabel} 위주로 가볍게 시작해 보는 걸 추천해요.`;
  }
  return `지금 가장 부족한 영양소는 ${priorityLabel}(${display(priorityRemaining)} ${priorityUnit ?? "g"} 남음)이에요. 카드를 눌러 다른 영양소 추천도 볼 수 있어요!`;
}

export function getStatsCoachComment({
  days,
  metricLabel,
  unit,
  recordedCount,
  average,
  targetValue,
}: {
  days: 1 | 7 | 30;
  metricLabel: string;
  unit: string;
  recordedCount: number;
  average: number;
  targetValue?: number;
}): string {
  if (recordedCount === 0) {
    return `최근 ${days}일 동안 아직 기록된 식단이 없어요. 식단 기록 탭에서 오늘 한 끼부터 가볍게 시작해 볼까요?`;
  }
  if (days === 1) {
    if (targetValue && targetValue > 0) {
      const rate = Math.round((average / targetValue) * 100);
      return `이 날 ${metricLabel} 섭취량은 목표 대비 ${rate}%예요. 끼니별 분포 그래프에서 어느 끼니 비중이 큰지 한눈에 확인해 보세요.`;
    }
    return `이 날의 ${metricLabel} 끼니별 분포와 탄단지 열량 비율을 그래프로 정리했어요.`;
  }
  if (targetValue && targetValue > 0) {
    const rate = Math.round((average / targetValue) * 100);
    const tone =
      rate > 110
        ? "목표보다 조금 높게 유지되고 있어요. 간식이나 저녁 분량을 살짝 줄여보면 좋아요."
        : rate < 85
          ? "목표 대비 조금 적게 드시고 있어요. 영양 부족이 쌓이지 않게 조금만 더 챙겨주세요."
          : "목표치에 아주 가깝게 안정적인 흐름을 유지하고 계시네요!";
    return `${days}일 중 ${recordedCount}일 기록하셨고, 하루 평균 ${metricLabel}은 ${display(average)} ${unit}(목표의 ${rate}%)입니다. ${tone}`;
  }
  return `${days}일 중 ${recordedCount}일을 기록해 하루 평균 ${display(average)} ${unit}를 섭취하고 있어요. 목표 설정을 해두면 목표선과 바로 비교할 수 있어요!`;
}

export function getGoalsCoachComment({
  goal,
  targetCalories,
  protein,
  change,
}: {
  goal?: Goal;
  targetCalories?: number;
  protein?: number;
  change: number | null;
}): string {
  if (!goal || !targetCalories) {
    return "키·체중·활동량을 입력하고 저장하면 저 곰 코치가 하루 권장 칼로리와 탄단지를 바로 계산해 드릴게요!";
  }
  const changeNote =
    change !== null && change !== 0
      ? `지금까지 기록상 ${change > 0 ? `+${change}` : change} kg의 체중 변화가 있었어요. `
      : "";
  if (goal === "diet") {
    return `${changeNote}체지방 감량 모드에서는 근손실을 막기 위해 단백질 ${display(protein ?? 0)} g을 꼭 지키면서 목표 ${display(targetCalories)} kcal를 유지하는 게 핵심이에요.`;
  }
  if (goal === "bulk") {
    return `${changeNote}근육량 증가 모드네요! 목표 ${display(targetCalories)} kcal와 충분한 탄수화물·단백질(${display(protein ?? 0)} g)로 운동 에너지를 채워주세요.`;
  }
  return `${changeNote}체중 유지 모드로 ${display(targetCalories)} kcal가 설정되어 있어요. 생활 활동량이 달라졌다면 언제든 조건을 다시 저장하세요.`;
}
