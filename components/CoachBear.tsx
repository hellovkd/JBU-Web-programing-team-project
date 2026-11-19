"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FlameIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
  TargetIcon,
  XIcon,
} from "@/components/Icons";
import {
  AnimatedCircularProgressBar,
  DotPattern,
  NumberTicker,
  ShineBorder,
} from "@/components/MagicPrimitives";
import {
  COACH_TIPS,
  COACH_TIP_CATEGORIES,
  type CoachTipCategory,
} from "@/lib/coachTips";

export type HeroCalorieSummary = {
  consumed: number;
  target: number;
  remaining: number;
  rate: number;
  mealCount: number;
  recordedDays7: number;
};

/** 대시보드 최상단 딥 포레스트 곰 코치 브리핑 & 달성률 히어로 스테이지 */
export function CoachHeroCard({
  headline,
  message,
  tag,
  goalBadge,
  calorieSummary,
}: {
  headline: string;
  message: string;
  tag: string;
  goalBadge?: string;
  calorieSummary?: HeroCalorieSummary;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const tip = COACH_TIPS[tipIndex % COACH_TIPS.length];
  const hasCalorieTarget = Boolean(calorieSummary && calorieSummary.target > 0);
  const isOverTarget = Boolean(calorieSummary && calorieSummary.remaining < 0);

  return (
    <section className="coach-hero" aria-label="곰 코치의 오늘 브리핑">
      <DotPattern width={20} height={20} cr={1} className="coach-hero-dots" />
      <ShineBorder
        borderWidth={1.5}
        duration={16}
        shineColor={["#c8e68c", "#4aa974", "#c8e68c"]}
      />

      <div className="coach-hero-main">
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
            <Link href="/meals" className="hero-cta-primary">
              오늘 식단 기록하기
            </Link>
            <Link href="/goals" className="hero-cta-ghost">
              목표 설정
            </Link>
          </div>
        </div>

        {calorieSummary ? (
          hasCalorieTarget ? (
            <div className="coach-hero-gauge" aria-label="오늘 칼로리 달성 요약">
              <AnimatedCircularProgressBar
                value={calorieSummary.rate}
                max={100}
                gaugePrimaryColor={isOverTarget ? "#f2a666" : "#c8e68c"}
                gaugeSecondaryColor="rgba(255, 255, 255, 0.16)"
                label="오늘 칼로리 목표 대비 달성률"
                sublabel={isOverTarget ? "목표 초과" : "오늘 달성"}
                className="coach-hero-ring"
              />
              <dl className="coach-hero-gauge-meta">
                <div>
                  <dt>
                    <FlameIcon size={13} />
                    <span>오늘 섭취</span>
                  </dt>
                  <dd>
                    <NumberTicker value={calorieSummary.consumed} />{" "}
                    <small>kcal</small>
                  </dd>
                </div>
                <div>
                  <dt>하루 목표</dt>
                  <dd>
                    <NumberTicker value={calorieSummary.target} />{" "}
                    <small>kcal</small>
                  </dd>
                </div>
                <div>
                  <dt>{isOverTarget ? "초과 열량" : "남은 열량"}</dt>
                  <dd className={isOverTarget ? "is-over" : undefined}>
                    <NumberTicker value={Math.abs(calorieSummary.remaining)} />{" "}
                    <small>kcal</small>
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="coach-hero-gauge is-empty" aria-label="목표 칼로리 미설정 안내">
              <span className="coach-hero-gauge-icon">
                <TargetIcon size={20} />
              </span>
              <strong>목표 칼로리 미설정</strong>
              <p>신체 정보와 목표를 입력하면 오늘 달성률 게이지를 실시간으로 보여드릴게요.</p>
              <Link href="/goals" className="hero-cta-ghost">
                목표 계산하기
              </Link>
            </div>
          )
        ) : null}
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
          className="coach-tip-next"
          onClick={() => setTipIndex((prev) => (prev + 1) % COACH_TIPS.length)}
        >
          <RefreshCwIcon size={14} />
          <span>다음 팁</span>
        </button>
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
