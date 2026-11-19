import Link from "next/link";
import { auth } from "@/auth";
import { NavLinks } from "@/components/NavLinks";
import { logoutAction } from "@/lib/actions";
import { authenticationConfigured } from "@/lib/config";

// 공통 메뉴를 표시하고 세션 유무에 따라 로그인·로그아웃 메뉴를 구분합니다.
export async function SiteHeader() {
  const session = authenticationConfigured() ? await auth() : null;

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* 로그인 상태에서는 대시보드로, 비로그인 상태에서는 처음 안내 페이지(/)로 이동합니다. */}
        <Link className="brand" href={session?.user ? "/dashboard" : "/"}>
          <span className="brand-symbol" aria-hidden="true" />
          <span>탄단지</span>
        </Link>
        {/* 기록 메뉴와 계정 메뉴를 묶어 화면 너비에 맞춰 줄을 바꿉니다. */}
        <NavLinks />
        <nav className="header-account" aria-label="계정 메뉴">
          {session?.user ? (
            <>
              <span className="account-name">{session.user.name}님</span>
              <form action={logoutAction}>
                <button className="secondary-button" type="submit">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/register">회원가입</Link>
              <Link className="secondary-button" href="/login">
                로그인
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
