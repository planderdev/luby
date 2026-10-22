/**
 * Toss Payments server-side API helpers. SERVER ONLY.
 *
 * Auth: HTTP Basic with `{secretKey}:` base64-encoded (password empty).
 * Docs: https://docs.tosspayments.com/reference
 */

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status:
    | "READY"
    | "IN_PROGRESS"
    | "WAITING_FOR_DEPOSIT"
    | "DONE"
    | "CANCELED"
    | "PARTIAL_CANCELED"
    | "ABORTED"
    | "EXPIRED";
  totalAmount: number;
  method: string | null;
  approvedAt: string | null;
  requestedAt: string;
  currency: string;
  [key: string]: unknown;
};

export type TossError = {
  code: string;
  message: string;
};

export type TossConfirmResult =
  | { ok: true; payment: TossPayment }
  | { ok: false; error: TossError; status: number };

/** widget = 결제위젯 키(단건 결제), billing = API 개별 연동 키(자동결제 계약 MID — 빌링키 발급·자동결제 승인) */
type KeyKind = "widget" | "billing";

function getSecretKey(kind: KeyKind): string {
  const key = kind === "billing" ? process.env.TOSS_BILLING_SECRET_KEY : process.env.TOSS_SECRET_KEY;
  if (!key) {
    throw new Error(
      `${kind === "billing" ? "TOSS_BILLING_SECRET_KEY" : "TOSS_SECRET_KEY"} is not configured. ` +
        "토스페이먼츠 개발자센터 → API 키의 시크릿 키를 환경변수로 등록하세요."
    );
  }
  return key;
}

/** 자동결제는 결제위젯 키로는 안 되고 'API 개별 연동 키' 쌍이 있어야 켜진다 */
export function isBillingConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY && !!process.env.TOSS_BILLING_SECRET_KEY;
}

type TossResult<T> = { ok: true; data: T } | { ok: false; error: TossError; status: number };

/** 토스 API 호출 공통 — 네트워크 오류·JSON 아닌 응답도 예외 대신 실패 결과로 돌려준다(status 0 = 응답 못 받음). */
async function tossCall<T>(
  path: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: unknown; key?: KeyKind; idempotencyKey?: string },
): Promise<TossResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${TOSS_API_BASE}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${getSecretKey(init.key ?? "widget")}:`).toString("base64")}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        // 같은 키로 다시 보내면 토스가 첫 결과를 돌려준다(15일) — 응답 유실 뒤 재요청해도 이중 결제 없음
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      // 결제 승인·조회는 절대 캐시되면 안 됨
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, status: 0, error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : String(e) } };
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    return {
      ok: false,
      status: res.status,
      error: {
        code: typeof body?.code === "string" ? body.code : "UNKNOWN",
        message:
          typeof body?.message === "string" ? body.message : "결제 승인에 실패했습니다.",
      },
    };
  }
  return { ok: true, data: body as T };
}

async function tossRequest(path: string, init: Parameters<typeof tossCall>[1]): Promise<TossConfirmResult> {
  const r = await tossCall<TossPayment>(path, init);
  return r.ok ? { ok: true, payment: r.data } : r;
}

/**
 * 결제 승인 — 위젯에서 성공 리다이렉트로 받은 paymentKey/orderId/amount를
 * 토스에 최종 승인 요청. 이 호출이 성공해야 실제로 돈이 결제됨.
 */
export function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
  return tossRequest("/payments/confirm", { method: "POST", body: params });
}

/**
 * 결제 키로 결제 조회 — 토스가 기록한 실제 상태(승인 완료·입금 대기·취소 등).
 * 중복 승인(ALREADY_PROCESSED_PAYMENT)·응답 유실·웹훅 수신 때 이 결과를 기준으로 맞춘다.
 * (주문번호 조회 /payments/orders/{orderId} 는 문서용 테스트 키에서 NOT_FOUND_MERCHANT 라 쓰지 않음)
 */
export function getTossPayment(paymentKey: string): Promise<TossConfirmResult> {
  return tossRequest(`/payments/${encodeURIComponent(paymentKey)}`, { method: "GET" });
}

export type TossBillingAuth = {
  billingKey: string;
  customerKey: string;
  cardCompany: string | null;
  cardNumber: string | null;
  card?: { cardType?: string | null; ownerType?: string | null } | null;
  [key: string]: unknown;
};

/** 카드 등록창 성공 리다이렉트의 authKey 로 빌링키 발급 — 발급된 빌링키는 다시 조회할 수 없으니 바로 저장 */
export function issueBillingKey(params: { authKey: string; customerKey: string }): Promise<TossResult<TossBillingAuth>> {
  return tossCall<TossBillingAuth>("/billing/authorizations/issue", { method: "POST", body: params, key: "billing" });
}

/** 빌링키로 자동결제 승인 — orderId 를 멱등키로 써서 같은 주문이 두 번 결제되지 않게 한다 */
export function chargeBillingKey(
  billingKey: string,
  body: { customerKey: string; amount: number; orderId: string; orderName: string; customerEmail?: string; customerName?: string },
): Promise<TossConfirmResult> {
  return tossRequest(`/billing/${encodeURIComponent(billingKey)}`, { method: "POST", body, key: "billing", idempotencyKey: body.orderId });
}

/** 자동결제 주문 조회(응답을 못 받은 결제 확인용) — 자동결제 MID 의 키로 조회 */
export function getBillingPaymentByOrderId(orderId: string): Promise<TossConfirmResult> {
  return tossRequest(`/payments/orders/${encodeURIComponent(orderId)}`, { method: "GET", key: "billing" });
}

/** 더 쓰지 않는 빌링키 삭제(카드 변경·삭제 시) */
export function deleteBillingKey(billingKey: string): Promise<TossResult<{ billingKey: string }>> {
  return tossCall<{ billingKey: string }>(`/billing/${encodeURIComponent(billingKey)}`, { method: "DELETE", key: "billing" });
}
