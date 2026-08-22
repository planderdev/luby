import Image from "next/image";

export type PosterData = {
  title: string;
  businessName: string;
  promotion: string | null;
  pointAmount: number;
  recruitCount: number;
  recruitEnd: string;
  alwaysOpen: boolean;
  channels: string[];
  offerings: { title: string; estimated_value: number | null }[];
  url: string;
  qrSvg: string;
  locale: "ko" | "en" | "zh";
};

/** A4 세로 매장용 포스터 시트 — 화면에서는 카드, 인쇄 시 210×297mm */
export function PosterSheet({ d }: { d: PosterData }) {
  const c = d;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  const T = {
    ko: { eyebrow: "체험단 모집 중", scan: "QR을 스캔해 응모하세요", reward: "활동 포인트", offer: "제공 혜택", until: c.alwaysOpen ? "상시 모집" : `${fmtDate(c.recruitEnd)}까지`, recruit: `${c.recruitCount}명 모집`, via: "루비AI 체험단 플랫폼 · luby.im" },
    en: { eyebrow: "Creators wanted", scan: "Scan to apply", reward: "Reward points", offer: "What you get", until: c.alwaysOpen ? "Always open" : `Until ${new Date(c.recruitEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, recruit: `${c.recruitCount} spots`, via: "Luby AI creator campaigns · luby.im" },
    zh: { eyebrow: "体验官招募中", scan: "扫码报名", reward: "活动积分", offer: "提供内容", until: c.alwaysOpen ? "长期招募" : `截止 ${new Date(c.recruitEnd).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}`, recruit: `招募 ${c.recruitCount} 人`, via: "Luby AI 体验官平台 · luby.im" },
  }[d.locale];

  return (
    <div className="mx-auto flex aspect-[210/297] w-full max-w-[640px] flex-col justify-between overflow-hidden rounded-3xl border border-border bg-white p-10 text-[#151217] shadow-sm print:m-0 print:aspect-auto print:h-[297mm] print:w-[210mm] print:max-w-none print:rounded-none print:border-0 print:p-[18mm] print:shadow-none">
      <div>
        <div className="flex items-center justify-between">
          <Image src="/logo-email.png" alt="루비AI" width={178} height={56} className="h-7 w-auto" unoptimized />
          <span className="rounded-full bg-[#ffe5f4] px-3 py-1 text-xs font-semibold text-[#bc006f]">{T.eyebrow}</span>
        </div>
        <h1 className="display mt-10 break-keep text-[34px] font-semibold leading-[1.15] print:text-[38px]" style={{ textWrap: "balance" }}>{c.title}</h1>
        <p className="mt-3 text-lg text-[#6b6472]">{c.businessName}{c.promotion ? ` · ${c.promotion}` : ""}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[#ff2aa7] px-3.5 py-1.5 font-semibold text-white">{T.reward} {c.pointAmount.toLocaleString()}P</span>
          <span className="rounded-full border border-[#e3dde7] px-3.5 py-1.5">{T.recruit}</span>
          <span className="rounded-full border border-[#e3dde7] px-3.5 py-1.5">{T.until}</span>
          {c.channels.slice(0, 3).map((n) => <span key={n} className="rounded-full border border-[#e3dde7] px-3.5 py-1.5">{n}</span>)}
        </div>
        {c.offerings.length > 0 && (
          <div className="mt-8">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6472]">{T.offer}</div>
            <ul className="mt-2 space-y-1 text-[15px]">
              {c.offerings.map((o, i) => (
                <li key={i} className="flex gap-2"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#ff2aa7]" />{o.title}{o.estimated_value ? <span className="text-[#6b6472]"> (약 {o.estimated_value.toLocaleString()}원)</span> : null}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-2xl font-semibold">{T.scan}</div>
          <div className="mt-1 text-sm text-[#6b6472]">{c.url.replace(/^https?:\/\//, "")}</div>
          <div className="mt-6 text-[11px] text-[#9a93a0]">{T.via}</div>
        </div>
        <div className="size-44 shrink-0 rounded-2xl border border-[#e3dde7] p-2 print:size-52" dangerouslySetInnerHTML={{ __html: c.qrSvg }} />
      </div>
    </div>
  );
}
