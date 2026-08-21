import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search } from "lucide-react";

export const metadata = { title: "페이지를 찾을 수 없어요" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 py-16 text-center">
      <Link href="/" aria-label="루비AI 홈" className="mb-12 inline-flex">
        <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-7 w-auto invert dark:invert-0" />
      </Link>
      <p className="text-xs uppercase tracking-[0.24em] text-accent-ink">404</p>
      <h1 className="display mt-4 text-3xl font-semibold lg:text-5xl">페이지를 찾을 수 없어요</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">
        주소가 바뀌었거나 삭제된 페이지예요. 링크를 다시 확인하거나 아래에서 이동해 주세요.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          <ArrowLeft className="size-4" /> 홈으로
        </Link>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium hover:bg-muted"
        >
          <Search className="size-4" /> 캠페인 둘러보기
        </Link>
      </div>
      <p className="mt-16 text-xs text-muted-foreground">
        문제가 계속되면 <a href="mailto:contact@plander.io" className="underline underline-offset-2">contact@plander.io</a>
      </p>
    </main>
  );
}
