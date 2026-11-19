"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";

const GAUGE_RADIUS = 44;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function formatLocaleValue(value: number, decimalPlaces: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(decimalPlaces));
  return rounded.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  });
}

/**
 * Magic UI `AnimatedCircularProgressBar` 패턴을 기반으로 한 원형 진행률 게이지입니다.
 * SSR과 reduced-motion 환경에서 즉시 최종 값을 보장하며 ARIA 진행률 속성을 제공합니다.
 */
export function AnimatedCircularProgressBar({
  value = 0,
  max = 100,
  min = 0,
  gaugePrimaryColor = "var(--sprout)",
  gaugeSecondaryColor = "rgba(255, 255, 255, 0.16)",
  label = "오늘 달성률",
  sublabel,
  className = "",
}: {
  value?: number;
  max?: number;
  min?: number;
  gaugePrimaryColor?: string;
  gaugeSecondaryColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const span = Math.max(1, max - min);
  const rawPercent = Math.round(((value - min) / span) * 100);
  const clampedPercent = Math.max(0, Math.min(100, rawPercent));
  const strokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - clampedPercent / 100);

  return (
    <div
      className={`magic-gauge ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.max(min, Math.min(max, value))}
      style={
        {
          "--gauge-circ": `${GAUGE_CIRCUMFERENCE.toFixed(2)}`,
        } as CSSProperties
      }
    >
      <svg className="magic-gauge-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={GAUGE_RADIUS}
          fill="none"
          stroke={gaugeSecondaryColor}
          strokeWidth="9"
          className="magic-gauge-track"
        />
        <circle
          cx="50"
          cy="50"
          r={GAUGE_RADIUS}
          fill="none"
          stroke={gaugePrimaryColor}
          strokeWidth="9"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={clampedPercent > 0 ? "round" : "butt"}
          className="magic-gauge-arc"
        />
      </svg>
      <div className="magic-gauge-center">
        <strong className="magic-gauge-pct">{Math.max(0, rawPercent)}%</strong>
        {sublabel ? <span className="magic-gauge-sublabel">{sublabel}</span> : null}
      </div>
    </div>
  );
}

/**
 * Magic UI `ShineBorder` 패턴을 CSS 키프레임과 마스크로 경량 구현한 외곽선 하이라이트입니다.
 */
export function ShineBorder({
  borderWidth = 1.5,
  duration = 16,
  shineColor = ["#c8e68c", "#4aa974", "#c8e68c"],
  className = "",
  style,
}: {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
  className?: string;
  style?: CSSProperties;
}) {
  const colors = Array.isArray(shineColor) ? shineColor.join(",") : shineColor;

  return (
    <div
      aria-hidden="true"
      className={`magic-shine-border ${className}`.trim()}
      style={
        {
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent, transparent, ${colors}, transparent, transparent)`,
          ...style,
        } as CSSProperties
      }
    />
  );
}

/**
 * Magic UI `NumberTicker` 패턴을 `requestAnimationFrame` + `IntersectionObserver`로 구현한 숫자 카운트업입니다.
 * 초기 렌더는 최종 값을 출력해 SSR 하이드레이션 불일치를 막고 reduced-motion을 존중합니다.
 */
export function NumberTicker({
  value,
  decimalPlaces = 0,
  duration = 650,
  className = "",
}: {
  value: number;
  decimalPlaces?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const animatedOnceRef = useRef(false);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || !Number.isFinite(value)) {
      el.textContent = formatLocaleValue(value, decimalPlaces);
      previousValueRef.current = value;
      return;
    }

    let rafId = 0;

    const runAnimation = (fromValue: number, toValue: number) => {
      cancelAnimationFrame(rafId);
      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = fromValue + (toValue - fromValue) * eased;
        el.textContent = formatLocaleValue(
          progress >= 1 ? toValue : current,
          decimalPlaces,
        );
        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          previousValueRef.current = toValue;
        }
      };

      rafId = requestAnimationFrame(step);
    };

    if (animatedOnceRef.current) {
      runAnimation(previousValueRef.current, value);
      return () => cancelAnimationFrame(rafId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        animatedOnceRef.current = true;
        runAnimation(0, value);
      },
      { threshold: 0.1 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [value, decimalPlaces, duration]);

  return (
    <span ref={ref} className={`magic-ticker ${className}`.trim()}>
      {formatLocaleValue(value, decimalPlaces)}
    </span>
  );
}

/**
 * Magic UI `DotPattern` 패턴을 SVG `<pattern>` 요소로 경량화한 배경 텍스처입니다.
 */
export function DotPattern({
  width = 18,
  height = 18,
  cr = 1.1,
  className = "",
}: {
  width?: number;
  height?: number;
  cr?: number;
  className?: string;
}) {
  const patternId = useId();

  return (
    <svg
      aria-hidden="true"
      className={`magic-dot-pattern ${className}`.trim()}
    >
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
        >
          <circle cx={width / 2} cy={height / 2} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
