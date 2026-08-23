/** 대시보드 경로 → 역할별 가이드 페이지 (가장 구체적인 패턴 우선). 가이드 slug 는 docs/manuals H2 번호 */
type Role = "advertiser" | "influencer" | "operator";
type Target = Partial<Record<Role, string>>;

const RULES: { test: RegExp; to: Target }[] = [
  { test: /^\/dashboard\/campaigns\/[^/]+\/poster/, to: { advertiser: "/docs/advertiser/3", operator: "/docs/advertiser/3" } },
  { test: /^\/dashboard\/campaigns\/(new|[^/]+\/edit)/, to: { advertiser: "/docs/advertiser/2", operator: "/docs/operator/3-1" } },
  { test: /^\/dashboard\/campaigns\/[^/]+/, to: { advertiser: "/docs/advertiser/4", influencer: "/docs/creator/4", operator: "/docs/operator/3" } },
  { test: /^\/dashboard\/campaigns/, to: { advertiser: "/docs/advertiser/2", influencer: "/docs/creator/3", operator: "/docs/operator/2-1" } },
  { test: /^\/dashboard\/applications/, to: { advertiser: "/docs/advertiser/4", influencer: "/docs/creator/5" } },
  { test: /^\/dashboard\/messages/, to: { advertiser: "/docs/advertiser/4", influencer: "/docs/creator/5" } },
  { test: /^\/dashboard\/invitations/, to: { influencer: "/docs/creator/4" } },
  { test: /^\/dashboard\/points/, to: { influencer: "/docs/creator/6" } },
  { test: /^\/dashboard\/portfolio/, to: { influencer: "/docs/creator/7" } },
  { test: /^\/dashboard\/billing/, to: { advertiser: "/docs/advertiser/6" } },
  { test: /^\/dashboard\/creators/, to: { advertiser: "/docs/advertiser/3", operator: "/docs/operator/4" } },
  { test: /^\/dashboard\/advertisers/, to: { influencer: "/docs/creator/4" } },
  { test: /^\/dashboard\/notifications/, to: { advertiser: "/docs/advertiser/7", influencer: "/docs/creator/8", operator: "/docs/operator/8" } },
  { test: /^\/dashboard\/settings/, to: { advertiser: "/docs/advertiser/1", influencer: "/docs/creator/2", operator: "/docs/operator/9" } },
  { test: /^\/dashboard\/operator\/users/, to: { operator: "/docs/operator/2" } },
  { test: /^\/dashboard\/operator\/campaigns/, to: { operator: "/docs/operator/3" } },
  { test: /^\/dashboard\/operator\/withdrawals/, to: { operator: "/docs/operator/5" } },
  { test: /^\/dashboard\/operator\/payments/, to: { operator: "/docs/operator/6" } },
  { test: /^\/dashboard\/operator\/(stats|ai-usage|errors)/, to: { operator: "/docs/operator/7" } },
  { test: /^\/dashboard\/operator\/audit/, to: { operator: "/docs/operator/7-1" } },
  { test: /^\/dashboard\/?$/, to: { advertiser: "/docs/advertiser/1", influencer: "/docs/creator/1", operator: "/docs/operator/1" } },
];

export function guideHrefFor(pathname: string, role: string): string {
  const r = role as Role;
  for (const rule of RULES) {
    if (rule.test.test(pathname)) return rule.to[r] ?? (r === "operator" ? rule.to.advertiser ?? "/docs" : "/docs");
  }
  return "/docs";
}
