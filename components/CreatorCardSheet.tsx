import Image from "next/image";

export type CreatorCardData = {
  name: string;
  avatarUrl: string | null;
  categories: string[];
  region: string | null;
  channels: { type: string; handle: string | null; followers: number }[];
  url: string;
  qrSvg: string;
};

const fmtN = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천` : n.toLocaleString());

/** 명함 1장 (90×55mm 비율). 화면·인쇄 공통, 흰 종이 고정색 */
function Card({ d }: { d: CreatorCardData }) {
  const channels = d.channels.slice(0, 3);
  return (
    <div className="flex h-full w-full items-stretch justify-between gap-3 bg-white p-[4mm] text-[#151217]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          {d.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ffe5f4] text-xs font-semibold text-[#bc006f]">{d.name.slice(0, 1)}</span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-tight">{d.name}</div>
            <div className="truncate text-[8.5px] text-[#6b6472]">
              {[d.categories.slice(0, 2).join(" · "), d.region].filter(Boolean).join(" · ") || "크리에이터"}
            </div>
          </div>
        </div>
        <ul className="mt-2 space-y-[3px] text-[8.5px] leading-tight">
          {channels.map((ch, i) => (
            <li key={i} className="flex items-center gap-1 truncate">
              <span className="size-1 shrink-0 rounded-full bg-[#ff2aa7]" />
              <span className="font-medium">{ch.type}</span>
              {ch.handle && <span className="truncate text-[#6b6472]">@{ch.handle.replace(/^@/, "")}</span>}
              {ch.followers > 0 && <span className="ml-auto shrink-0 tabular-nums text-[#6b6472]">{fmtN(ch.followers)}</span>}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <Image src="/logo-email.png" alt="루비AI" width={178} height={56} className="h-[9px] w-auto" unoptimized />
          <span className="truncate text-[7.5px] text-[#9a93a0]">{d.url.replace(/^https?:\/\//, "").replace(/(\/p\/[0-9a-f]{8})[0-9a-f-]+$/, "$1…")}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center">
        <div className="size-[19mm] rounded-md border border-[#e3dde7] p-[1mm]" dangerouslySetInnerHTML={{ __html: d.qrSvg }} />
        <div className="mt-[2px] text-[6.5px] text-[#9a93a0]">스캔 → 포트폴리오</div>
      </div>
    </div>
  );
}

/** A4 세로 한 장에 명함 10장(2×5, 90×55mm). 절취선은 연한 점선 */
export function CreatorCardSheet({ d }: { d: CreatorCardData }) {
  return (
    <div className="mx-auto w-full max-w-[640px] overflow-hidden rounded-3xl border border-border bg-white shadow-sm print:m-0 print:h-[297mm] print:w-[210mm] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div className="grid aspect-[210/297] w-full grid-cols-2 grid-rows-5 content-center justify-center gap-0 px-[6%] py-[3.5%] print:aspect-auto print:h-full print:px-[15mm] print:py-[11mm]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-[90/55] border border-dashed border-[#d9d3de] print:aspect-auto print:h-[55mm] print:w-[90mm]">
            <Card d={d} />
          </div>
        ))}
      </div>
    </div>
  );
}
