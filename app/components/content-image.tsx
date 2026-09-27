import Image from "next/image";

export function ContentImage({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  return <Image src={src} alt={alt} width={160} height={160} unoptimized className={className} style={{ width: "auto", height: "auto" }} />;
}
