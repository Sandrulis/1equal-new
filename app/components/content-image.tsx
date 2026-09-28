import Image from "next/image";

export function ContentImage({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  return <Image src={src} alt={alt} width={64} height={64} unoptimized className={className} />;
}
