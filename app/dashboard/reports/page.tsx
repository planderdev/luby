import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, FileBarChart, Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ListLoadError } from "@/components/dashboard/ListLoadError";
import { logError } from "@/lib/error-log";

export const metadata = { title: "결과 보고서" };

/**
 * 결과 보고서 목록 — 리뷰 링크 엑셀로 만든 보고서(광고주는 내 것, 운영자는 전체).
 * 캠페인 성과 리포트(/r/<report_token>)와 별개로, 엑셀이 곧 결과인 '강제' 보고서다.
 */
export default async function ReviewReportsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "advertiser" && profile.role !== "operator") redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("review_reports")
    .select("id, title, business_name, owner_id, campaign_id, is_public, token, created_at, updated_at, review_report_rows(count)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) await logError({ source: "server", message: `review_reports list: ${error.message}`, path: "/dashboard/reports" });

  type Row = {
    id: string; title: string; business_name: string; owner_id: string; campaign_id: string | null; is_public: boolean; token: string;
    created_at: string; updated_at: string; review_report_rows: { count: number }[] | null;
  };
  const reports = (data ?? []) as unknown as Row[];
  let owners = new Map<string, string>();
  if (profile.role === "operator" && reports.length > 0) {
    const ids = Array.from(new Set(reports.map((r) => r.owner_id)));
    const { data: ps } = await supabase.from("profiles").select("id, name").in("id", ids);
    owners = new Map((ps ?? []).map((p) => [p.id, p.name ?? ""]));
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im").replace(/\/$/, "");
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-semibold lg:text-4xl">결과 보고서</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            리뷰 링크가 든 엑셀을 올리면 클라이언트에게 보낼 보고서 페이지가 만들어집니다. 캠페인 진행 흐름과 상관없이 쓸 수 있어요.
          </p>
        </div>
        <Link href="/dashboard/reports/new" className="btn-neon inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold">
          <Plus className="size-4" /> 보고서 만들기
        </Link>
      </div>

      {error ? (
        <div className="mt-8"><ListLoadError label="결과 보고서" /></div>
      ) : reports.length === 0 ? (
        <div className="mt-8 rounded-3xl glass-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft">
            <FileBarChart className="size-6 text-accent-ink" />
          </div>
          <p className="mt-4 text-sm font-medium">아직 만든 보고서가 없어요</p>
          <p className="mt-1 text-xs text-muted-foreground">엑셀 한 장이면 됩니다. 리뷰 링크·이름·팔로워·좋아요 열을 알아서 읽어요.</p>
          <Link href="/dashboard/reports/new" className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted">
            <Plus className="size-3.5" /> 첫 보고서 만들기
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {reports.map((r) => {
            const count = r.review_report_rows?.[0]?.count ?? 0;
            return (
              <li key={r.id} className="rounded-3xl glass-card px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/dashboard/reports/${r.id}`} className="block truncate text-base font-semibold hover:underline underline-offset-4">{r.title}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {r.business_name && <span>{r.business_name}</span>}
                      <span>· 리뷰 {count}건</span>
                      <span>· {fmtDate(r.updated_at)}</span>
                      {profile.role === "operator" && owners.get(r.owner_id) && <span>· {owners.get(r.owner_id)}</span>}
                      {r.campaign_id && <span className="rounded-full bg-muted px-2 py-0.5">캠페인 연결</span>}
                      <span className={`rounded-full px-2 py-0.5 ${r.is_public ? "bg-success-soft text-success" : "bg-muted"}`}>{r.is_public ? "링크 공개" : "링크 꺼짐"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/reports/${r.id}`} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-muted">편집</Link>
                    <a href={`${siteUrl}/r/${r.token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-muted">
                      보고서 열기 <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
