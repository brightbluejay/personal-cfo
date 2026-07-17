import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rust)]">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = "plain",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "plain" | "sage" | "rust";
}) {
  const toneClass =
    tone === "sage"
      ? "border-[var(--sage)] bg-[var(--sage-soft)]"
      : tone === "rust"
        ? "border-[var(--rust-soft)] bg-[var(--rust-pale)]"
        : "border-[var(--line)] bg-white";
  return (
    <article className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{detail}</p>
    </article>
  );
}

export function SectionCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-white ${className}`}
    >
      <div className="border-b border-[var(--line)] px-5 py-4">
        {eyebrow ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const classes =
    tone === "good"
      ? "bg-[var(--sage-soft)] text-[var(--sage-dark)]"
      : tone === "warn"
        ? "bg-[var(--rust-pale)] text-[var(--rust)]"
        : "bg-[var(--canvas)] text-[var(--muted)]";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${classes}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="p-8 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}
