import { NextResponse } from "next/server";
import { revalidatePublicCampaign, revalidatePublicCreator } from "@/lib/cache/public-revalidate";

/**
 * 공개 페이지 캐시 강제 갱신 (운영·자동화용).
 *
 * 앱 안에서 일어나는 변경은 서버 액션이 스스로 재검증한다(lib/cache/public-revalidate.ts).
 * 이 라우트는 DB 를 직접 고쳤거나 크론·외부 작업이 상태를 바꾼 뒤 기다리지 않고 반영해야 할 때 쓴다.
 * 인증은 알림 웹훅과 같은 비밀키(x-webhook-secret).
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { kind?: string; id?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { kind, id } = payload;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  if (kind === "campaign") revalidatePublicCampaign(id);
  else if (kind === "creator") revalidatePublicCreator(id);
  else return NextResponse.json({ error: "kind must be campaign or creator" }, { status: 400 });

  return NextResponse.json({ ok: true, kind, id });
}
