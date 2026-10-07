import Image from "next/image";

function canOptimize(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "ehl.entuziasti.com") return true;
    return url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

export function ContentImage({ src, alt = "", className, width = 64, height = 64 }: { src: string; alt?: string; className?: string; width?: number; height?: number }) {
  return <Image src={src} alt={alt} width={width} height={height} unoptimized={!canOptimize(src)} className={className} />;
}
