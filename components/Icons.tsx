import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function SvgIcon({
  size = 16,
  children,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** 돋보기 아이콘 */
export function SearchIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </SvgIcon>
  );
}

/** 브랜드 태그 아이콘 */
export function TagIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".75" fill="currentColor" />
    </SvgIcon>
  );
}

/** 영양 맞춤 추천 아이콘 */
export function SparklesIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </SvgIcon>
  );
}

/** 막대 차트 아이콘 */
export function ChartBarIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-6" />
    </SvgIcon>
  );
}

/** 달력 아이콘 */
export function CalendarIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </SvgIcon>
  );
}

/** 왼쪽 화살표 아이콘 */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </SvgIcon>
  );
}

/** 오른쪽 화살표 아이콘 */
export function ChevronRightIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  );
}

/** 완료 및 적정 상태 아이콘 */
export function CheckCircleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </SvgIcon>
  );
}

/** 부족 및 초과 알림 아이콘 */
export function AlertTriangleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m10.29 3.86-7.4 12.8A2 2 0 0 0 4.62 19.6h14.76a2 2 0 0 0 1.73-2.94l-7.4-12.8a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </SvgIcon>
  );
}

/** 추가 아이콘 */
export function PlusIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </SvgIcon>
  );
}

/** 닫기·초기화 아이콘 */
export function XIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  );
}

/** 새 창 열기 아이콘 */
export function ExternalLinkIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </SvgIcon>
  );
}
