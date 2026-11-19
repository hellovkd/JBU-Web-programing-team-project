"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "계산 기록", match: (path: string) => path.startsWith("/dashboard") },
  { href: "/meals", label: "식단 기록", match: (path: string) => path === "/meals" },
  { href: "/meals/stats", label: "식단 통계", match: (path: string) => path.startsWith("/meals/stats") },
  { href: "/foods", label: "내 음식", match: (path: string) => path.startsWith("/foods") },
] as const;

/** 현재 경로에 맞춰 활성 메뉴를 표시하는 상단 기록 내비게이션입니다. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="header-navigation" aria-label="기록 메뉴">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "nav-link nav-link-active" : "nav-link"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
