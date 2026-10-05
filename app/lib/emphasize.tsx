import { Fragment, type ReactNode } from "react";

export function emphasize(text: string, value: string): ReactNode {
  if (!value || !text.includes(value)) return text;
  const parts = text.split(value);
  return parts.map((part, index) => (
    <Fragment key={`${index}-${part}`}>
      {index > 0 ? <strong className="font-semibold text-ink">{value}</strong> : null}
      {part}
    </Fragment>
  ));
}
