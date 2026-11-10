import type { NextAuthConfig } from "next-auth";

// localhost의 쿠키는 포트로 분리되지 않으므로 수업 프로젝트와 다른 이름을 사용합니다.
// 이름만 변경해 HttpOnly, SameSite, HTTPS 보안 옵션은 Auth.js 기본값을 유지합니다.
export function getDevelopmentAuthCookies(
  environment: string | undefined = process.env.NODE_ENV,
): NextAuthConfig["cookies"] {
  if (environment !== "development") return undefined;
  return {
    sessionToken: { name: "tandanji.authjs.session-token" },
    callbackUrl: { name: "tandanji.authjs.callback-url" },
    csrfToken: { name: "tandanji.authjs.csrf-token" },
  };
}
