import {
  ArrowUpRight,
  Beef,
  Calendar,
  ChartColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Droplet,
  ExternalLink,
  Flame,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Salad,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  TriangleAlert,
  UtensilsCrossed,
  Wheat,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

function createLucideIcon(Icon: LucideIcon) {
  return function WrappedIcon({
    size = 16,
    strokeWidth = 1.8,
    "aria-hidden": ariaHidden = true,
    ...props
  }: LucideProps) {
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden={ariaHidden}
        {...props}
      />
    );
  };
}

/** 돋보기 아이콘 */
export const SearchIcon = createLucideIcon(Search);
/** 브랜드 태그 아이콘 */
export const TagIcon = createLucideIcon(Tag);
/** 영양 맞춤 추천 아이콘 */
export const SparklesIcon = createLucideIcon(Sparkles);
/** 막대·추이 차트 아이콘 */
export const ChartBarIcon = createLucideIcon(ChartColumnIncreasing);
/** 식단 통계 내비게이션 아이콘 */
export const StatsIcon = createLucideIcon(ChartColumnIncreasing);
/** 달력 아이콘 */
export const CalendarIcon = createLucideIcon(Calendar);
/** 왼쪽 화살표 아이콘 */
export const ChevronLeftIcon = createLucideIcon(ChevronLeft);
/** 오른쪽 화살표 아이콘 */
export const ChevronRightIcon = createLucideIcon(ChevronRight);
/** 완료 및 적정 상태 아이콘 */
export const CheckCircleIcon = createLucideIcon(CircleCheck);
/** 부족 및 초과 알림 아이콘 */
export const AlertTriangleIcon = createLucideIcon(TriangleAlert);
/** 추가 아이콘 */
export const PlusIcon = createLucideIcon(Plus);
/** 닫기·초기화 아이콘 */
export const XIcon = createLucideIcon(X);
/** 새 창 열기 아이콘 */
export const ExternalLinkIcon = createLucideIcon(ExternalLink);
/** 곰 코치 말풍선 아이콘 */
export const MessageCircleIcon = createLucideIcon(MessageCircle);
/** 다음 팁 전환 아이콘 */
export const RefreshCwIcon = createLucideIcon(RefreshCw);
/** 목표 아이콘 */
export const TargetIcon = createLucideIcon(Target);
/** 대시보드 아이콘 */
export const DashboardIcon = createLucideIcon(LayoutDashboard);
/** 식단 기록 아이콘 */
export const MealsIcon = createLucideIcon(UtensilsCrossed);
/** 내 음식 관리 아이콘 */
export const FoodsIcon = createLucideIcon(Salad);
/** 칼로리 불꽃 아이콘 */
export const FlameIcon = createLucideIcon(Flame);
/** 탄수화물 곡물 아이콘 */
export const CarbsIcon = createLucideIcon(Wheat);
/** 단백질 아이콘 */
export const ProteinIcon = createLucideIcon(Beef);
/** 지방 아이콘 */
export const FatIcon = createLucideIcon(Droplet);
/** 대사량·체중 저울 아이콘 */
export const ScaleIcon = createLucideIcon(Scale);
/** 로그아웃 아이콘 */
export const LogOutIcon = createLucideIcon(LogOut);
/** 이동 링크 화살표 아이콘 */
export const ArrowUpRightIcon = createLucideIcon(ArrowUpRight);
/** 필터·설정 슬라이더 아이콘 */
export const SlidersIcon = createLucideIcon(SlidersHorizontal);
