import { authPre, authPost } from "@/components/landing-re/auth-chrome";
import { LreScripts } from "@/components/landing-re/LreScripts";

/**
 * 인증(로그인·가입·재설정) 공통 셸 — 팀장님 리뉴얼 시안(luby-re)의 auth 레이아웃.
 *
 * 크롬(사이트 헤더·푸터·오버레이)은 시안 조각을 그대로 서버 렌더하고, 폼 영역은
 * 시안의 signup-form 마크업 계약(.form-field 등)에 맞춰 React 자식을 담는다.
 * 폼 로직(Supabase 인증·오타 힌트·중복가입 안내)은 각 페이지의 React 컴포넌트 소관.
 */
export function AuthShell({
  children,
  title,
  subtitle,
  eyebrow = "Login",
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  eyebrow?: string;
}) {
  return (
    <div className="lre-root page page-signup page-auth">
      <div dangerouslySetInnerHTML={{ __html: authPre }} />
      <main id="main" tabIndex={-1}>
        <section className="signup-section auth-section theme-paper" data-header-theme="light">
          {/* 기존 기획의 2단 구조(폼 + 브랜드 패널)에 시안 스킨을 입힌 믹스 레이아웃 */}
          <div className="section-shell signup-layout auth-layout lax-grid">
            {/* data-i18n-ignore: 시안 i18n.js 의 텍스트 노드 치환(CJK 래핑)이 React 소유
                DOM 을 건드리면 재렌더 때 insertBefore 가 깨진다 — 폼 영역은 제외 */}
            <div className="signup-form auth-form" data-i18n-ignore>
              <div className="signup-form__top auth-form__top">
                <div>
                  <span className="signup-form__eyebrow">{eyebrow}</span>
                  <h2>{title}</h2>
                  <p className="auth-form__copy">{subtitle}</p>
                </div>
              </div>
              {children}
            </div>
            <aside className="lax-visual" aria-hidden="true" data-i18n-ignore>
              <p className="lax-eyebrow">Global Campaign Platform</p>
              <p className="lax-copy">
                전 세계 체험단을,
                <br />
                한 번의 캠페인으로.
              </p>
              <p className="lax-sub">8,500명 이상의 글로벌 인플루언서가 루비AI에서 새 캠페인을 기다리고 있습니다.</p>
              <dl className="lax-stats">
                <div>
                  <dd>8,500+</dd>
                  <dt>등록 크리에이터</dt>
                </div>
                <div>
                  <dd>1,200+</dd>
                  <dt>진행 캠페인</dt>
                </div>
                <div>
                  <dd>12</dd>
                  <dt>활동 국가</dt>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </main>
      <div dangerouslySetInnerHTML={{ __html: authPost }} />
      <LreScripts bundle="/lre/shared.js" />
    </div>
  );
}
