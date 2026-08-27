import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { NoticeForm, type NoticeRow } from "./NoticeForm";
import { NoticeList } from "./NoticeList";

export const metadata = { title: "공지 팝업 — 루비AI" };

export default async function NoticesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/operator/notices");
  if (profile.role !== "operator") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("notice_popups")
    .select("id, title, image_url, link_url, starts_at, ends_at, active, sort_order")
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false });

  const notices = (data ?? []) as NoticeRow[];
  const live = notices.filter(
    (n) => n.active && new Date(n.starts_at).getTime() <= Date.now() && (!n.ends_at || new Date(n.ends_at).getTime() > Date.now())
  ).length;

  return (
    <div>
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영자</p>
        <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">공지 팝업</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          메인 페이지(한국어·영어·중국어)에 뜨는 공지 팝업입니다. 지금 {live}개가 노출중이고, 기간이 겹치면 순서가 높은 것부터 나란히 보입니다.
          방문자가 &quot;오늘 하루 보지 않기&quot;를 누르면 그 기기에서 자정까지 숨겨집니다. 등록 후 랜딩에 반영되기까지 최대 1분 걸립니다.
        </p>
      </header>

      <h2 className="mt-10 text-lg font-semibold">새 팝업</h2>
      <div className="mt-3">
        <NoticeForm />
      </div>

      <h2 className="mt-10 text-lg font-semibold">등록된 팝업 {notices.length > 0 && <span className="text-muted-foreground">({notices.length})</span>}</h2>
      <div className="mt-3">
        <NoticeList notices={notices} />
      </div>
    </div>
  );
}
