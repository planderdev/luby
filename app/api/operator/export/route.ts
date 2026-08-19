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
  } else if (type === "member-template") {
    const { memberTemplateCsv } = await import("@/lib/member-import");
    const [{ data: regions }, { data: channelTypes }, { data: categories }] = await Promise.all([
      supabase.from("regions").select("id, name").eq("active", true).order("sort_order"),
      supabase.from("channel_types").select("id, name, slug").eq("active", true).order("sort_order"),
      supabase.from("categories").select("id, name").eq("active", true).order("sort_order"),
    ]);
    const csv = memberTemplateCsv({ regions: regions ?? [], channelTypes: channelTypes ?? [], categories: categories ?? [] });
    return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="luby-member-template.csv"`, "cache-control": "no-store" } });
  } else if (type === "members") {
    const role = searchParams.get("role"); // advertiser|agency|influencer|all
    const { data: profiles } = await supabase.from("profiles").select("id, email, name, phone, role, approved, created_at, operator_tags, referred_by").neq("role", "operator").order("created_at", { ascending: false }).limit(5000);
    const ids = (profiles ?? []).map((p) => p.id);
    const [{ data: advs }, { data: infs }, { data: chs }, { data: regions }, { data: cats }, { data: subs }, { data: plans }] = await Promise.all([
      supabase.from("advertisers").select("profile_id, company_name, advertiser_kind, business_number, representative_name, business_address, tax_email, website").in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("influencers").select("profile_id, region_id, bio, total_points, public_profile").in("profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("influencer_channels").select("influencer_id, followers, url, channel_types(name)").in("influencer_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("regions").select("id, name"),
      supabase.from("influencer_categories").select("influencer_id, categories(name)").in("influencer_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("subscriptions").select("advertiser_id, plan_id, expires_at, status"),
      supabase.from("plans").select("id, name"),
    ]);
    const advById = new Map((advs ?? []).map((a) => [a.profile_id, a]));
    const infById = new Map((infs ?? []).map((i) => [i.profile_id, i]));
    const regionById = new Map((regions ?? []).map((r) => [r.id, r.name]));
    const planById = new Map((plans ?? []).map((p) => [p.id, p.name]));
    const subById = new Map((subs ?? []).map((s) => [s.advertiser_id, s]));
    type Named = { name: string } | { name: string }[] | null;
    const nameOf = (n: Named) => (Array.isArray(n) ? n[0]?.name : n?.name) ?? "";
    const chByInf = new Map<string, { names: string[]; followers: number; urls: string[] }>();
    for (const c of chs ?? []) { const cur = chByInf.get(c.influencer_id) ?? { names: [], followers: 0, urls: [] }; cur.names.push(nameOf(c.channel_types as Named)); cur.followers += c.followers ?? 0; cur.urls.push(c.url); chByInf.set(c.influencer_id, cur); }
    const catByInf = new Map<string, string[]>();
    for (const c of cats ?? []) { const cur = catByInf.get(c.influencer_id) ?? []; cur.push(nameOf(c.categories as Named)); catByInf.set(c.influencer_id, cur); }
    const filtered = (profiles ?? []).filter((p) => {
      const a = advById.get(p.id);
      if (role === "advertiser") return p.role === "advertiser" && a?.advertiser_kind !== "agency";
      if (role === "agency") return p.role === "advertiser" && a?.advertiser_kind === "agency";
      if (role === "influencer") return p.role === "influencer";
      return true;
    });
    header = ["역할", "이메일", "이름", "연락처", "승인", "가입일(KST)", "회사명", "사업자등록번호", "대표자", "사업장주소", "세금계산서이메일", "웹사이트", "플랜", "플랜만료", "활동지역", "채널", "채널URL", "팔로워합", "전문분야", "포인트", "공개프로필", "운영태그", "추천인ID"];
    lines = filtered.map((p) => {
      const a = advById.get(p.id); const i = infById.get(p.id); const ch = chByInf.get(p.id); const sub = subById.get(p.id);
      const roleLabel = p.role === "advertiser" ? (a?.advertiser_kind === "agency" ? "대행사" : "광고주") : "크리에이터";
      return [roleLabel, p.email, p.name, p.phone ?? "", p.approved ? "Y" : "N", kst(p.created_at), a?.company_name ?? "", a?.business_number ?? "", a?.representative_name ?? "", a?.business_address ?? "", a?.tax_email ?? "", a?.website ?? "", sub ? planById.get(sub.plan_id) ?? "" : (p.role === "advertiser" ? "FREE" : ""), sub?.expires_at ? kst(sub.expires_at) : "", i?.region_id ? regionById.get(i.region_id) ?? "" : "", ch?.names.join(";") ?? "", ch?.urls.join(";") ?? "", ch?.followers ?? "", catByInf.get(p.id)?.join(";") ?? "", i?.total_points ?? "", i ? (i.public_profile ? "Y" : "N") : "", (p.operator_tags ?? []).join(";"), p.referred_by ?? ""].map(String);
    });
  } else {
    return NextResponse.json({ error: "type must be payments|withdrawals|members|member-template" }, { status: 400 });
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
