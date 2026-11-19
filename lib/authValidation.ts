// 클라이언트와 서버에서 재사용하는 최소 입력 검증이며 DB·인증 라이브러리에 의존하지 않습니다.
export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(password: unknown): password is string {
  // bcrypt의 72바이트 제한을 넘기면 뒷부분이 잘리므로 글자 수와 UTF-8 바이트 수를 함께 제한합니다.
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    new TextEncoder().encode(password).length <= 72
  );
}

// 허용된 내부 페이지로만 이동시켜 로그인 후 외부 사이트로 보내는 조작을 차단합니다.
export function safeReturnTo(value: unknown): "/" | "/dashboard" | "/meals" | "/meals/stats" | "/foods" | "/goals" {
  // 보호된 페이지에서 로그인해도 원래 경로로 돌아오도록 허용된 내부 경로만 통과시킵니다.
  if (
    value === "/" ||
    value === "/meals" ||
    value === "/meals/stats" ||
    value === "/foods" ||
    value === "/goals"
  ) {
    return value;
  }
  return "/dashboard";
}
