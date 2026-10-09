import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand-mark" aria-label="Chácara Serra Verde — página inicial">
    <svg aria-hidden viewBox="0 0 58 38" className="h-9 w-14 shrink-0" fill="none"><path d="M2 32 18 10l8 11L36 4l20 28" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><path d="m10 32 8-13 8 13m4 0 7-17 12 17" fill="currentColor" opacity=".16" /><path d="M8 32h43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    {!compact && <span>Chácara<br /><strong>Serra Verde</strong></span>}
  </Link>;
}
