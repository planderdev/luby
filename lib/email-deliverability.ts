import "server-only";
import { promises as dns } from "node:dns";
import { suggestEmail } from "@/lib/email-typo";

/**
 * 일괄 재발송 전 주소 점검(2026-10-12). 반송 이력(email_suppressions)과 별개로,
 * 오타 주소(gamil.com·naver.con 등)와 메일을 받을 수 없는 도메인(MX 없음)은 보내면 곧바로 반송돼 발신 평판을 깎는다.
 * 8/28~29 가입 급증 때 미인증 32명 중 2명이 .con 도메인이었다.
 *
 * DNS 조회가 시간 초과 등으로 실패하면 '문제 없음'으로 본다 — 확실할 때만 막는다.
 */
const DNS_TIMEOUT_MS = 3000;

async function mxStatus(domain: string): Promise<"ok" | "none" | "unknown"> {
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), DNS_TIMEOUT_MS)),
    ]);
    return mx.length > 0 ? "ok" : "none";
  } catch (e) {
    const code = (e as { code?: string }).code;
    // 도메인이 없거나(ENOTFOUND) MX 레코드가 없음(ENODATA) — 메일을 받을 수 없다
    if (code === "ENOTFOUND" || code === "ENODATA") return "none";
    return "unknown";
  }
}

/** 여러 주소를 한 번에 점검한다(도메인별 DNS 조회 1회). 반환: 소문자 주소 → 사유. 문제 없는 주소는 들어 있지 않다. */
export async function undeliverableReasons(emails: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const byDomain = new Map<string, string[]>();
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    const at = email.lastIndexOf("@");
    if (at < 1) { out.set(email, "이메일 형식 오류"); continue; }
    const typo = suggestEmail(email);
    if (typo) { out.set(email, `오타 의심(${typo} 아닌가요?)`); continue; }
    const dom = email.slice(at + 1);
    byDomain.set(dom, [...(byDomain.get(dom) ?? []), email]);
  }
  await Promise.all(
    [...byDomain.entries()].map(async ([dom, list]) => {
      if ((await mxStatus(dom)) === "none") for (const e of list) out.set(e, "메일을 받을 수 없는 도메인");
    }),
  );
  return out;
}
