function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TeamMark({
  name,
  logoUrl,
  className,
  textClassName = "text-xs",
}: {
  name: string;
  logoUrl?: string | null;
  className: string;
  textClassName?: string;
}) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={`${className} bg-paper object-contain p-0.5`} />;
  }
  return (
    <span aria-hidden="true" className={`${className} grid place-items-center bg-navy font-semibold text-white ${textClassName}`}>
      {initials(name)}
    </span>
  );
}
