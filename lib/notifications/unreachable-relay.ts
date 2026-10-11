/**
 * 연락 불가 광고주 알림 대신 전달(2026-10-11).
 *
 * 운영자가 일괄 등록하거나 대신 캠페인을 올린 광고주 중에는 메일 주소가 없는 주소(하드 바운스 → Resend 차단)이거나
 * 한 번도 로그인하지 않은 계정이 있다. 이들에게 '새 응모자' '콘텐츠 제출' 같은 처리할 일이 생겨도 아무도 모른다.
 * 그런 알림이 생기면 실제 운영자 전원에게 같은 내용을 '[대신 확인]' 알림으로 한 번 더 만든다(앱·푸시·메일은 기존 웹훅이 이어받음).
 *
 * 의존성은 주입한다 — 이 파일은 server-only 를 import 하지 않아 스크립트 하네스로 검증할 수 있다.
 */

/** 광고주가 직접 처리해야 하는 알림만 대신 전달한다(마케팅·다이제스트·안내는 제외). */
export const RELAY_TYPES = new Set([
  "new_application",
  "nudge_select_applicants",
  "submission_received",
  "nudge_review_submission",
  "new_message",
  "invitation_accepted",
  "campaign_closed",
]);

export const RELAY_TYPE = "relay_unreachable_advertiser";
const INTERNAL_DOMAINS = ["ruby-ai.kr", "luby.im"];
const DEDUPE_HOURS = 12;

export type RelayInput = {
  userId: string;
  role: string | null;
  email: string;
  name: string | null;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  /** email_suppressions 에 있는 주소(하드 바운스·스팸 신고) */
  suppressed: boolean;
};

export type RelayDeps = {
  /** null = 한 번도 로그인 안 함, string = 마지막 로그인, undefined = 확인 실패(전달하지 않음) */
  lastSignInAt: (userId: string) => Promise<string | null | undefined>;
  operatorIds: () => Promise<string[]>;
  recentRelayExists: (link: string | null, body: string, sinceIso: string) => Promise<boolean>;
  insertNotifications: (
    rows: { user_id: string; type: string; title: string; body: string; link: string | null }[],
  ) => Promise<{ error?: string }>;
  now?: () => Date;
};

export type RelayResult = { relayed: number; reason?: string; skipped?: string };

export const REASON_SUPPRESSED = "광고주 이메일이 반송돼(없는 주소) 메일이 닿지 않아요";
export const REASON_NEVER_SIGNED_IN = "광고주가 한 번도 로그인하지 않은 계정이에요";

export function relayContent(input: RelayInput, reason: string): { title: string; body: string } {
  const who = (input.name ?? "").trim() || "광고주";
  const title = `[대신 확인] ${who} — ${input.title}`.slice(0, 120);
  const original = (input.body ?? "").trim();
  const body = `${original ? `${original} · ` : ""}${reason}. 운영자가 대신 처리하거나 광고주에게 연락해 주세요.`.slice(0, 300);
  return { title, body };
}

export async function relayForUnreachableAdvertiser(input: RelayInput, deps: RelayDeps): Promise<RelayResult> {
  if (input.role !== "advertiser") return { relayed: 0, skipped: "not advertiser" };
  if (!input.type || !RELAY_TYPES.has(input.type)) return { relayed: 0, skipped: "type not relayed" };
  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  if (INTERNAL_DOMAINS.includes(domain)) return { relayed: 0, skipped: "internal domain" };

  let reason: string | null = null;
  if (input.suppressed) {
    reason = REASON_SUPPRESSED;
  } else {
    const last = await deps.lastSignInAt(input.userId);
    if (last === undefined) return { relayed: 0, skipped: "sign-in unknown" };
    if (last === null) reason = REASON_NEVER_SIGNED_IN;
  }
  if (!reason) return { relayed: 0, skipped: "reachable" };

  const { title, body } = relayContent(input, reason);
  const now = deps.now ? deps.now() : new Date();
  const since = new Date(now.getTime() - DEDUPE_HOURS * 3600_000).toISOString();
  if (await deps.recentRelayExists(input.link, body, since)) return { relayed: 0, reason, skipped: "duplicate" };

  const ops = (await deps.operatorIds()).filter((id) => id !== input.userId);
  if (ops.length === 0) return { relayed: 0, reason, skipped: "no operators" };

  const { error } = await deps.insertNotifications(
    ops.map((id) => ({ user_id: id, type: RELAY_TYPE, title, body, link: input.link })),
  );
  if (error) return { relayed: 0, reason, skipped: `insert failed: ${error}` };
  return { relayed: ops.length, reason };
}

/** service_role 클라이언트로 만든 실제 의존성. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adminRelayDeps(admin: any): RelayDeps {
  return {
    lastSignInAt: async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data?.user) return undefined;
      return data.user.last_sign_in_at ?? null;
    },
    operatorIds: async () => {
      const { data } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "operator")
        .eq("approved", true)
        .not("email", "like", "%@ruby-ai.kr");
      return ((data ?? []) as { id: string }[]).map((r) => r.id);
    },
    recentRelayExists: async (link, body, sinceIso) => {
      let q = admin.from("notifications").select("id").eq("type", RELAY_TYPE).eq("body", body).gte("created_at", sinceIso).limit(1);
      q = link ? q.eq("link", link) : q.is("link", null);
      const { data } = await q;
      return (data ?? []).length > 0;
    },
    insertNotifications: async (rows) => {
      const { error } = await admin.from("notifications").insert(rows);
      return error ? { error: error.message } : {};
    },
  };
}
