import { initials } from "@/lib/format";
import { Leaf } from "lucide-react";

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-sage-light text-sage-dark grid place-items-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Leaf className="h-7 w-7 animate-pulse text-sage" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-sage-light text-sage">
        {icon ?? <Leaf className="h-7 w-7" />}
      </div>
      <h3 className="text-lg text-ink">{title}</h3>
      {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
    </div>
  );
}
