"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MessageCircleIcon, RefreshCwIcon, SparklesIcon, XIcon } from "@/components/Icons";
import {
  COACH_TIPS,
  COACH_TIP_CATEGORIES,
  type CoachTipCategory,
} from "@/lib/coachTips";

/** 대시보드 최상단 곰 코치 브리핑 & 순환 팁 히어로 카드 */
export function CoachHeroCard({
  headline,
  message,
  tag,
  goalBadge,
}: {
  headline: string;
  message: string;
  tag: string;
  goalBadge?: string;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const tip = COACH_TIPS[tipIndex % COACH_TIPS.length];

  return (
    <section className="coach-hero" aria-label="곰 코치의 오늘 브리핑">
      <div className="coach-hero-visual">
        <div className="coach-hero-stage">
          <Image
            src="/coach-world.webp"
            alt="운동복을 입은 곰 코치 일러스트"
            width={240}
            height={288}
            priority
            className="coach-hero-image"
          />
        </div>
      </div>

      <div className="coach-hero-content">
        <div className="coach-hero-top">
          <span className="coach-speaker-pill">
            <SparklesIcon size={14} />
            <span>곰 코치 오늘의 브리핑</span>
          </span>
          <span className="coach-tag-pill">{tag}</span>
          {goalBadge ? <span className="coach-goal-pill">{goalBadge}</span> : null}
        </div>

        <h1 className="coach-hero-headline">{headline}</h1>
        <p className="coach-hero-message">{message}</p>

        <div className="coach-hero-actions">
          <Link href="/meals" className="primary-button">
            오늘 식단 기록하기
          </Link>
          <Link href="/goals" className="secondary-button">
            목표 설정
          </Link>
        </div>

        <div className="coach-tip-bar" aria-live="polite">
          <div className="coach-tip-copy">
            <span className="coach-tip-badge">{COACH_TIP_CATEGORIES[tip.category]}</span>
            <div>
              <strong>{tip.title}</strong>
              <p>{tip.body}</p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button coach-tip-next"
            onClick={() => setTipIndex((prev) => (prev + 1) % COACH_TIPS.length)}
          >
            <RefreshCwIcon size={14} />
            <span>다음 팁</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/** 식단 기록 · 통계 · 목표 설정 · 로그인 화면에 등장하는 곰 코치 말풍선 배너 */
export function CoachBanner({
  message,
  badge,
  action,
}: {
  message: string;
  badge?: string;
  action?: ReactNode;
}) {
  return (
    <aside className="coach-banner" aria-label="곰 코치 안내">
      <div className="coach-banner-avatar">
        <Image src="/trainer-bear.webp" alt="곰 코치" width={52} height={52} />
      </div>
      <div className="coach-banner-body">
        <div className="coach-banner-head">
          <strong>곰 코치</strong>
          {badge ? <span className="coach-banner-badge">{badge}</span> : null}
        </div>
        <p>{message}</p>
      </div>
      {action ? <div className="coach-banner-action">{action}</div> : null}
    </aside>
  );
}

/** 모든 서비스 페이지 우측 하단에서 눌러서 팁을 확인하는 접이식 곰 코치 위젯 */
export function CoachFloatingWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CoachTipCategory | "all">("all");
  const [index, setIndex] = useState(0);

  const hidden = pathname === "/" || pathname.startsWith("/register");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const filteredTips = useMemo(() => {
    if (category !== "all") {
      return COACH_TIPS.filter((item) => item.category === category);
    }
    const routeMatches = COACH_TIPS.filter((item) => pathname.startsWith(item.route));
    const others = COACH_TIPS.filter((item) => !pathname.startsWith(item.route));
    return [...routeMatches, ...others];
  }, [category, pathname]);

  if (hidden) return null;

  const activeTip = filteredTips[index % filteredTips.length] ?? COACH_TIPS[0];

  return (
    <div className="coach-floating">
      {open ? (
        <section
          id="coach-floating-dialog"
          className="coach-floating-panel"
          aria-label="곰 코치 영양·운동 팁"
        >
          <header className="coach-floating-header">
            <div className="coach-floating-title">
              <Image src="/trainer-bear.webp" alt="" width={34} height={34} />
              <div>
                <strong>곰 코치의 한마디 팁</strong>
                <span>{COACH_TIP_CATEGORIES[activeTip.category]}</span>
              </div>
            </div>
            <button
              type="button"
              className="coach-floating-close"
              aria-label="곰 코치 팁 닫기"
              onClick={() => setOpen(false)}
            >
              <XIcon size={16} />
            </button>
          </header>

          <div className="coach-floating-cats" role="group" aria-label="팁 주제 선택">
            <button
              type="button"
              className={category === "all" ? "is-active" : undefined}
              onClick={() => {
                setCategory("all");
                setIndex(0);
              }}
            >
              이 화면 추천
            </button>
            {(Object.entries(COACH_TIP_CATEGORIES) as Array<[CoachTipCategory, string]>).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={category === key ? "is-active" : undefined}
                  onClick={() => {
                    setCategory(key);
                    setIndex(0);
                  }}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          <div className="coach-floating-bubble" aria-live="polite">
            <h3>{activeTip.title}</h3>
            <p>{activeTip.body}</p>
          </div>

          <div className="coach-floating-footer">
            <span>
              {(index % filteredTips.length) + 1} / {filteredTips.length}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIndex((prev) => (prev + 1) % filteredTips.length)}
            >
              <RefreshCwIcon size={14} />
              <span>다음 팁 보기</span>
            </button>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="coach-floating-trigger"
        aria-expanded={open}
        aria-controls="coach-floating-dialog"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Image src="/trainer-bear.webp" alt="" width={28} height={28} />
        <MessageCircleIcon size={16} />
        <span>곰 코치 팁</span>
      </button>
    </div>
  );
}
