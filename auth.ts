import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/users";
import { getDevelopmentAuthCookies } from "@/lib/authCookies";

// 이메일·비밀번호를 Credentials Provider로 검증하고 JWT 세션으로 로그인 상태를 유지합니다.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        return verifyCredentials(credentials?.email, credentials?.password);
      },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  // 개발 중 다른 localhost 앱의 로그인 쿠키를 읽지 않도록 분리합니다.
  cookies: getDevelopmentAuthCookies(),
});
