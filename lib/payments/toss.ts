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

function getSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) {
    throw new Error(
      "TOSS_SECRET_KEY is not configured. " +
        "토스페이먼츠 개발자센터 → API 키의 시크릿 키를 환경변수로 등록하세요."
    );
  }
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString("base64")}`;
}

/** 토스 API 호출 공통 — 네트워크 오류·JSON 아닌 응답도 예외 대신 실패 결과로 돌려준다(status 0 = 응답 못 받음). */
async function tossRequest(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<TossConfirmResult> {
  let res: Response;
  try {
    res = await fetch(`${TOSS_API_BASE}${path}`, {
      method: init.method,
      headers: {
        Authorization: authHeader(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
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
  return { ok: true, payment: body as TossPayment };
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
