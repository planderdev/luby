"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif", background: "#0a0a0c", color: "#f5f5f7" }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "#ff2aa7" }}>Luby AI</p>
          <h1 style={{ fontSize: 32, fontWeight: 600, margin: "16px 0 0" }}>잠시 후 다시 시도해 주세요</h1>
          <p style={{ maxWidth: 420, fontSize: 14, lineHeight: 1.7, color: "#9ca0ac", margin: "16px 0 0" }}>
            일시적인 오류가 발생했어요.{error.digest ? ` (오류 코드 ${error.digest})` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 40, borderRadius: 999, border: 0, background: "#f5f5f7", color: "#0a0a0c", padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
