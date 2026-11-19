"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  FoodsIcon,
  MealsIcon,
  StatsIcon,
  TargetIcon,
} from "@/components/Icons";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: DashboardIcon,
    match: (path: string) => path.startsWith("/dashboard"),
  },
  {
    href: "/meals",
    label: "식단 기록",
    icon: MealsIcon,
    match: (path: string) => path === "/meals",
  },
  {
    href: "/meals/stats",
    label: "식단 통계",
    icon: StatsIcon,
    match: (path: string) => path.startsWith("/meals/stats"),
  },
  {
    href: "/foods",
    label: "내 음식",
    icon: FoodsIcon,
    match: (path: string) => path.startsWith("/foods"),
  },
  {
    href: "/goals",
    label: "목표 설정",
    icon: TargetIcon,
    match: (path: string) => path.startsWith("/goals"),
  },
] as const;

/** 현재 경로에 맞춰 활성 메뉴를 표시하는 상단 기록 내비게이션입니다. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="header-navigation" aria-label="기록 메뉴">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "nav-link nav-link-active" : "nav-link"}
          >
            <Icon size={15} className="nav-link-icon" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
