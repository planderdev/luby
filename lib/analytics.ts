/**
 * 전환 이벤트 트래킹 — 클라이언트("use client" 컴포넌트)용.
 * 서버 액션·서버 컴포넌트에서는 lib/analytics-server.ts 의 trackServer() 사용.
 * 실패해도 절대 흐름을 막지 않는다 (fire-and-forget).
 *
 * 이벤트 목록 (Vercel → Analytics → Events):
 *   signup_completed   {role}                          — SignupForm
 *   campaign_created   {mode: submit|draft, ai: yes|no} — createCampaignAndRedirect (server)
 *   application_sent   {}                              — ApplyButton
 *   checkout_started   {plan}                          — CheckoutClient
 *   payment_completed  {plan, amount}                  — billing/success (server, alreadyPaid 제외)
 */
import { track } from "@vercel/analytics";

type Props = Record<string, string | number | boolean>;

export function trackClient(event: string, props?: Props) {
  try {
    track(event, props);
  } catch {
    /* noop */
  }
}
