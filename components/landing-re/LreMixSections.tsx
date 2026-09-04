import { dictionaries, type Locale } from "@/lib/i18n";

/**
 * 리뉴얼 홈에 끼워 넣는 기존 기획 섹션(작동 방식·핵심 기능·요금제) — "믹싱".
 *
 * 카피는 기존 랜딩 사전(dictionaries)을 그대로 쓰고, 겉모습은 시안(luby-re)의
 * 토큰·타이포 언어(app/lre-mix.css)로 입힌다. CTA(contact-choice) 직전에 렌더된다.
 * data-i18n-ignore: 시안 i18n.js 가 React DOM 을 건드리지 못하게 (SKILL.md 함정 참조).
 */

// 플랜 이름·가격·링크는 로케일 무관 (기존 components/Pricing.tsx 와 동일한 값)
const PLAN_LAYOUT = [
  { name: "FREE", price: "₩0", primary: false, href: "/signup?role=advertiser" },
  { name: "BUSINESS", price: "₩1,800,000", primary: true, href: "/signup?role=advertiser" },
  {
    name: "ENTERPRISE",
    price: "Custom",
    primary: false,
    href: "mailto:contact@plander.io?subject=%5BLuby%20AI%5D%20ENTERPRISE%20%ED%94%8C%EB%9E%9C%20%EC%83%81%EB%8B%B4%20%EB%AC%B8%EC%9D%98",
  },
] as const;

export function LreMixSections({ locale }: { locale: Locale }) {
  const dict = dictionaries[locale];
  const how = dict.howItWorks;
  const feat = dict.features;
  const pricing = dict.pricing;

  return (
    <div className="lmx" data-i18n-ignore>
      {/* 작동 방식 */}
      <section className="lmx-section" aria-labelledby="lmx-how">
        <div className="lmx-shell">
          <p className="lmx-label">{how.label}</p>
          <h2 id="lmx-how" className="lmx-heading">
            {how.heading1}
            <br />
            {how.heading2}
          </h2>
          <div className="lmx-roles">
            {[how.advertiser, how.creator].map((role, ri) => (
              <article key={role.badge} className="lmx-role">
                <span className="lmx-badge">{role.badge}</span>
                <h3>{role.title}</h3>
                <p className="lmx-muted">{role.desc}</p>
                <ol>
                  {role.steps.map((s, i) => (
                    <li key={s.title}>
                      <span className="lmx-num">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{s.title}</strong>
                        <p>{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <a className={ri === 0 ? "lmx-btn lmx-btn--primary" : "lmx-btn"} href={ri === 0 ? "/signup?role=advertiser" : "/signup?role=influencer"}>
                  {role.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="lmx-section lmx-section--tint" aria-labelledby="lmx-feat">
        <div className="lmx-shell">
          <p className="lmx-label">{feat.label}</p>
          <h2 id="lmx-feat" className="lmx-heading">
            {feat.heading1}
            <br />
            {feat.heading2}
          </h2>
          <div className="lmx-cards">
            {feat.cards.map((c) => (
              <article key={c.title} className="lmx-card">
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 요금제 */}
      <section className="lmx-section" id="pricing" aria-labelledby="lmx-price">
        <div className="lmx-shell">
          <p className="lmx-label">{pricing.label}</p>
          <h2 id="lmx-price" className="lmx-heading">
            {pricing.heading1}
            <br />
            {pricing.heading2}
          </h2>
          <div className="lmx-plans">
            {pricing.plans.map((plan, i) => (
              <article key={PLAN_LAYOUT[i].name} className={PLAN_LAYOUT[i].primary ? "lmx-plan lmx-plan--primary" : "lmx-plan"}>
                {PLAN_LAYOUT[i].primary && <span className="lmx-plan__badge">{pricing.recommendedBadge}</span>}
                <h3>{PLAN_LAYOUT[i].name}</h3>
                <p className="lmx-plan__price">
                  {PLAN_LAYOUT[i].price}
                  <span> / {plan.period}</span>
                </p>
                <p className="lmx-muted">{plan.desc}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a className={PLAN_LAYOUT[i].primary ? "lmx-btn lmx-btn--primary" : "lmx-btn"} href={PLAN_LAYOUT[i].href}>
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
          <p className="lmx-footnote">{pricing.footnote}</p>
        </div>
      </section>
    </div>
  );
}
