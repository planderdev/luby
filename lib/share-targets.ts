/** 링크를 바로 보낼 수 있는 SNS — 앱 키·SDK 없이 주소만으로 열리는 것만 */
export type ShareTarget = { key: string; label: string; href: string };

export function shareTargets(url: string, title: string): ShareTarget[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { key: "line", label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${u}` },
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "threads", label: "Threads", href: `https://www.threads.net/intent/post?text=${t}%20${u}` },
    { key: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
}
