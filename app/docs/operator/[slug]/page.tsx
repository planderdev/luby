import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocsShell } from "@/components/docs/DocsShell";
import { DocPageView, docPageMetadata } from "@/components/docs/DocPageView";

/**
 * 운영자 전용 가이드 — 세션을 확인해야 하므로 캐치올(/docs/…)과 분리한 동적 라우트.
 * (캐치올은 CDN 캐시를 살리려고 쿠키를 읽지 않는다)
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = docPageMetadata("ko", "operator", slug);
  return { ...m, title: { absolute: typeof m.title === "string" ? `${m.title} — 루비AI 가이드` : "루비AI 가이드" }, robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "operator") notFound();

  return (
    <DocsShell lang="ko">
      <DocPageView lang="ko" group="operator" slug={slug} allowOperator />
    </DocsShell>
  );
}
