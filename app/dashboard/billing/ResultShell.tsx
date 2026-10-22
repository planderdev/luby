/** 결제·카드 등록 결과 화면 공통 틀(아이콘·제목·설명·상세·버튼) */
export function ResultShell({
  icon,
  title,
  desc,
  detail,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  detail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft">
        {icon}
      </div>
      <h1 className="display mt-6 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      {detail && <div className="mt-6 flex justify-center">{detail}</div>}
      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {children}
      </div>
    </div>
  );
}
