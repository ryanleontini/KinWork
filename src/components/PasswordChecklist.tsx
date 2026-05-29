import { Check, X } from "lucide-react";

export type PasswordChecks = {
  length: boolean;
  uppercase: boolean;
  digit: boolean;
  symbol: boolean;
};

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password);
  return c.length && c.uppercase && c.digit && c.symbol;
}

const rules: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "One uppercase letter" },
  { key: "digit", label: "One number" },
  { key: "symbol", label: "One symbol" },
];

export function PasswordChecklist({ password }: { password: string }) {
  const checks = checkPassword(password);
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {rules.map(({ key, label }) => {
        const ok = checks[key];
        return (
          <li
            key={key}
            className={`flex items-center gap-2 ${
              ok ? "text-sage-dark" : "text-muted"
            }`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded-full ${
                ok ? "bg-sage text-white" : "bg-line text-muted"
              }`}
            >
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
