import { getFocusPhraseChecks, META_DESC_LIMIT, META_TITLE_LIMIT } from "@/lib/seo";
import { Check, X } from "lucide-react";

export function CharCounter({ value, limit }: { value: string; limit: number }) {
  const len = value.length;
  const nearLimit = limit - 5;
  const color =
    len > limit ? "text-red-500" : len >= nearLimit ? "text-amber-500" : "text-muted-foreground";
  return (
    <span className={`text-xs ${color}`}>
      {len} / {limit}
    </span>
  );
}

export { META_TITLE_LIMIT, META_DESC_LIMIT };

export function FocusPhraseGuide({
  phrase,
  title,
  description,
  h1,
}: {
  phrase: string;
  title: string;
  description: string;
  h1?: string;
}) {
  if (!phrase.trim()) return null;
  const checks = getFocusPhraseChecks({ phrase, title, description, h1 });
  const passed = checks.filter((c) => c.ok).length;
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-medium">
        Focus keyphrase checks ({passed}/{checks.length})
      </p>
      <p className="text-[11px] text-muted-foreground">
        Google ignores a keywords meta tag. Use this phrase in the title, description, and H1 instead.
      </p>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center gap-2 text-xs">
            {check.ok ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={check.ok ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
