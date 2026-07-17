import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", marker: "01" },
  { href: "/transactions", label: "Transactions", marker: "02" },
  { href: "/spending", label: "Spending", marker: "03" },
  { href: "/debts", label: "Debts", marker: "04" },
  { href: "/monthly-review", label: "Monthly Review", marker: "05" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[var(--line)] bg-[var(--panel)] px-5 py-5 lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
          <div className="flex items-center justify-between lg:block">
            <Link
              href="/"
              className="group inline-flex items-center gap-3"
              aria-label="Personal CFO overview"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--ink)] font-mono text-sm font-semibold text-white transition-transform group-hover:-rotate-3">
                PC
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-tight">
                  Personal CFO
                </span>
                <span className="block text-xs text-[var(--muted)]">
                  Fictional demo
                </span>
              </span>
            </Link>
            <span className="rounded-full border border-[var(--sage)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sage-dark)] lg:mt-8 lg:inline-block">
              Local only
            </span>
          </div>

          <nav
            className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1"
            aria-label="Primary navigation"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)] lg:w-full"
              >
                <span className="font-mono text-[10px] text-[var(--faint)]">
                  {item.marker}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 hidden rounded-2xl border border-[var(--line)] bg-white p-4 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Product rule
            </p>
            <p className="mt-3 text-sm leading-6">
              Code calculates. GPT interprets. You decide.
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-9 xl:px-14">
          {children}
        </main>
      </div>
    </div>
  );
}
