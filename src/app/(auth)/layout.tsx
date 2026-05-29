import { Sprout } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sage text-white shadow-soft">
          <Sprout className="h-7 w-7" />
        </div>
        <h1 className="text-3xl text-ink">KinOS</h1>
        <p className="text-sm text-muted">Your family&apos;s garden</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
