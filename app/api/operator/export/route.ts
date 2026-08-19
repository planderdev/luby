import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 운영자 CSV 내보내기 — ?type=payments|withdrawals&from=YYYY-MM-DD&to=YYYY-MM-DD
 * 회계·정산 대사용. 운영자만(RLS + 역할 확인). UTF-8 BOM 포함(엑셀 한글 깨짐 방지).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "operator") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromIso = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? `${from}T00:00:00+09:00` : null;
  const toIso = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59+09:00` : null;

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const kst = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) : "");

  let header: string[] = [];
  let lines: string[][] = [];

  if (type === "payments") {
    let q = supabase
      .from("payments")
      .select("order_id, order_name, amount, status, method, payment_key, approved_at, created_at, advertiser_id, fail_reason")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);
    const { data } = await q;
    const ids = [...new Set((data ?? []).map((p) => p.advertiser_id))];
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, name, email").in("id", ids) : { data: [] };
    const { data: advs } = ids.length ? await supabase.from("advertisers").select("profile_id, company_name, business_number, representative_name, business_address, tax_email").in("profile_id", ids) : { data: [] };
    const pById = new Map((profs ?? []).map((p) => [p.id, p]));
    const aById = new Map((advs ?? []).map((a) => [a.profile_id, a]));
    header = ["생성일시(KST)", "승인일시(KST)", "주문번호", "상품명", "금액(원)", "상태", "결제수단", "회사명", "사업자번호", "대표자", "사업장주소", "세금계산서이메일", "담당자", "이메일", "결제키", "실패사유"];
    lines = (data ?? []).map((p) => {
      const pr = pById.get(p.advertiser_id);
      const ad = aById.get(p.advertiser_id);
      return [kst(p.created_at), kst(p.approved_at), p.order_id, p.order_name, p.amount, p.status, p.method ?? "", ad?.company_name ?? "", ad?.business_number ?? "", ad?.representative_name ?? "", ad?.business_address ?? "", ad?.tax_email ?? pr?.email ?? "", pr?.name ?? "", pr?.email ?? "", p.payment_key ?? "", p.fail_reason ?? ""].map(String);
    });
  } else if (type === "withdrawals") {
    let q = supabase
      .from("point_withdrawals")
      .select("id, amount, bank_name, account_number, account_holder, status, reject_reason, requested_at, processed_at, influencer_id")
      .order("requested_at", { ascending: false })
      .limit(5000);
    if (fromIso) q = q.gte("requested_at", fromIso);
    if (toIso) q = q.lte("requested_at", toIso);
    const { data } = await q;
    const ids = [...new Set((data ?? []).map((w) => w.influencer_id))];
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, name, email, phone").in("id", ids) : { data: [] };
    const pById = new Map((profs ?? []).map((p) => [p.id, p]));
    header = ["신청일시(KST)", "처리일시(KST)", "금액(P=원)", "상태", "은행", "계좌번호", "예금주", "크리에이터", "이메일", "연락처", "반려사유", "ID"];
    lines = (data ?? []).map((w) => {
      const pr = pById.get(w.influencer_id);
      return [kst(w.requested_at), kst(w.processed_at), w.amount, w.status, w.bank_name, w.account_number, w.account_holder, pr?.name ?? "", pr?.email ?? "", pr?.phone ?? "", w.reject_reason ?? "", w.id].map(String);
    });
  } else {
    return NextResponse.json({ error: "type must be payments|withdrawals" }, { status: 400 });
  }

  const csv = "﻿" + [header, ...lines].map((r) => r.map(esc).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="luby-${type}-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
