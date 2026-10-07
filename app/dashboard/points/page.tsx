import { redirect } from "next/navigation";
import Link from "next/link";
import { Coins } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { WithdrawalForm } from "./WithdrawalForm";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { getTranslationMap } from "@/lib/i18n/campaign-translations";

export async function generateMetadata() {
  const locale = await getAppLocale();
  const t = dashboardDict[locale].points.metaTitle;
  return { title: locale === "ko" ? t : { absolute: `${t} — Luby AI` } };
}

const STATUS_TONE: Record<string, string> = {
  requested: "bg-warning-soft text-warning",
  paid: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

export default async function PointsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "influencer") redirect("/dashboard");

  const supabase = await createClient();
  const locale = await getAppLocale({ profileLocale: profile.locale });
  const t = dashboardDict[locale].points;
  const [{ data: influencer }, { data: withdrawals }, { data: ledger }] = await Promise.all([
    supabase
      .from("influencers")
      .select("total_points")
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("point_withdrawals")
      .select("id, amount, bank_name, account_number, status, reject_reason, requested_at")
      .eq("influencer_id", profile.id)
      .order("requested_at", { ascending: false })
      .limit(30),
    supabase.rpc("get_my_point_ledger", { p_limit: 60 }),
  ]);
  const rawRows = (ledger ?? []) as { occurred_at: string; kind: string; title: string; detail: string; amount: number; ref_id: string | null; link: string | null }[];
  // /en·/zh: 원장의 한국어 문구(DB 함수가 만든 제목·설명)를 화면 언어로 — 캠페인 제목·상호는 번역본
  const trMap = locale === "ko" ? null : await getTranslationMap(rawRows.filter((r) => r.kind === "earn_campaign" && r.ref_id).map((r) => r.ref_id as string), locale);
  const rows = rawRows.map((r) => {
    if (!trMap) return r;
    const L = t.ledger;
    if (r.kind === "earn_campaign") {
      const tr = r.ref_id ? trMap.get(r.ref_id) : undefined;
      const biz = tr?.business_name ?? r.detail.replace(/ · 콘텐츠 승인$/, "");
      return { ...r, title: tr?.title ?? r.title, detail: `${biz} · ${L.approved}` };
    }
    if (r.kind === "earn_referral") return { ...r, title: L.referralTitle, detail: L.referralDetail(r.detail.replace(/님 첫 체험 완료$/, "")) };
    if (r.kind === "withdraw_paid") return { ...r, title: L.withdrawPaid };
    if (r.kind === "withdraw_pending") return { ...r, title: L.withdrawPending };
    if (r.kind.startsWith("withdraw_")) return { ...r, title: L.withdrawRejected };
    return r;
  });
  const earnedTotal = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const referralTotal = rows.filter((r) => r.kind === "earn_referral").reduce((s, r) => s + r.amount, 0);

  const balance = influencer?.total_points ?? 0;

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">{t.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.subtitle}
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-accent/30 bg-accent-soft/40 p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="size-4" />
            {t.balance}
          </div>
          <div className="display mt-2 text-4xl font-semibold">
            {balance.toLocaleString()}
            <span className="ml-1 text-lg text-muted-foreground">P</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t.rate}</p>
        </div>

        <div className="lg:col-span-2">
          <WithdrawalForm balance={balance} locale={locale} />
        </div>
      </div>

      {/* 포인트 내역 (적립·차감 원장) */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-2xl font-semibold">{t.ledgerTitle}</h2>
          <div className="text-xs text-muted-foreground">
            {t.earned(`${earnedTotal.toLocaleString()}P`)}{referralTotal > 0 ? t.referralEarned(`${referralTotal.toLocaleString()}P`) : ""}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            {t.ledgerEmpty}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-3xl glass-card">
            {rows.map((r, i) => {
              const positive = r.amount > 0;
              const pending = r.kind === "withdraw_pending";
              const label = t.kinds[r.kind] ?? t.kinds.withdraw_rejected;
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${positive ? "bg-success-soft text-success" : pending ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}`}>{label}</span>
                      <span className="truncate text-sm font-medium">{r.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.detail} · {new Date(r.occurred_at).toLocaleDateString(t.dateLocale, { year: "numeric", month: "numeric", day: "numeric" })}
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${positive ? "text-success" : r.amount < 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {r.amount > 0 ? "+" : ""}{r.amount.toLocaleString()}P
                  </div>
                </>
              );
              return (
                <li key={`${r.kind}-${r.ref_id ?? i}-${i}`}>
                  {r.link && r.kind === "earn_campaign" ? (
                    <Link href={r.link} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40">{inner}</Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl font-semibold">{t.withdrawalsTitle}</h2>
        {!withdrawals || withdrawals.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            {t.withdrawalsEmpty}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {withdrawals.map((w) => {
              const info = { label: t.status[w.status] ?? t.status.requested, tone: STATUS_TONE[w.status] ?? STATUS_TONE.requested };
              return (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass-card p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{w.amount.toLocaleString()}P</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {w.bank_name} {w.account_number} ·{" "}
                      {new Date(w.requested_at).toLocaleDateString(t.dateLocale)}
                    </div>
                    {w.status === "rejected" && w.reject_reason && (
                      <div className="mt-1 text-xs text-accent-ink">
                        {t.rejectReason(w.reject_reason)}
                      </div>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${info.tone}`}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
