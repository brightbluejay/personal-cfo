#!/usr/bin/env python3
"""Generate a conservative report from the fictional CSV demonstration data."""

from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
REPORTS = ROOT / "reports"


def read_csv(name: str) -> list[dict[str, str]]:
    path = DATA / name
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def money(value: str | float | int | None) -> float:
    if value is None or str(value).strip() == "":
        return 0.0
    return float(str(value).replace(",", "").strip())


def parse_date(value: str | None) -> date | None:
    if not value or not value.strip():
        return None
    return datetime.strptime(value.strip(), "%Y-%m-%d").date()


def gbp(value: float) -> str:
    sign = "-" if value < 0 else ""
    return f"{sign}£{abs(value):,.2f}"


def profile_map() -> dict[str, str]:
    return {row["key"]: row["value"] for row in read_csv("profile.csv")}


def main() -> None:
    profile = profile_map()
    planning_date = parse_date(profile.get("planning_date")) or date.today()
    current_balance = money(profile.get("current_bank_balance"))
    buffer_target = money(profile.get("minimum_cash_buffer"))

    income = read_csv("income.csv")
    essentials = read_csv("essential-expenses.csv")
    debts = read_csv("debts.csv")
    upcoming = read_csv("upcoming-expenses.csv")
    sinking = read_csv("sinking-funds.csv")

    confirmed_income = sum(
        money(row.get("amount"))
        for row in income
        if row.get("certainty", "").lower() == "confirmed"
    )
    confirmed_essentials = sum(
        money(row.get("amount"))
        for row in essentials
        if row.get("certainty", "").lower() == "confirmed"
        and row.get("paid", "").lower() != "yes"
    )
    debt_minimums = sum(money(row.get("minimum_payment")) for row in debts)
    confirmed_upcoming = sum(
        money(row.get("amount"))
        for row in upcoming
        if row.get("certainty", "").lower() == "confirmed"
    )
    monthly_sinking = sum(money(row.get("monthly_contribution")) for row in sinking)

    projected_after_known = (
        current_balance
        + confirmed_income
        - confirmed_essentials
        - debt_minimums
        - confirmed_upcoming
        - monthly_sinking
    )
    safe_to_spend = max(0.0, projected_after_known - buffer_target)

    promo_flags: list[str] = []
    for debt in debts:
        promo_end = parse_date(debt.get("promo_end_date"))
        if promo_end:
            days = (promo_end - planning_date).days
            if days <= 210:
                promo_flags.append(
                    f"{debt['name']}: promotional rate ends {promo_end.isoformat()} ({days} days)."
                )

    lines = [
        "# Personal CFO Fictional Demo Report",
        "",
        f"Generated for fictional planning date **{planning_date.isoformat()}**.",
        "",
        "## Current position",
        f"- Available current-account cash: **{gbp(current_balance)}**",
        f"- Confirmed income before the planning horizon ends: **{gbp(confirmed_income)}**",
        f"- Confirmed unpaid essentials: **{gbp(confirmed_essentials)}**",
        f"- Contractual debt minimums: **{gbp(debt_minimums)}**",
        f"- Confirmed upcoming costs: **{gbp(confirmed_upcoming)}**",
        f"- Planned sinking-fund contributions: **{gbp(monthly_sinking)}**",
        "",
        "## Safe-to-spend",
        f"**{gbp(safe_to_spend)}** after known commitments and a {gbp(buffer_target)} protected buffer.",
        "",
        "## Immediate observations",
    ]

    if projected_after_known < buffer_target:
        lines.append("- The plan does not fully preserve the stated protected buffer.")
    else:
        lines.append("- The confirmed plan preserves the stated protected buffer.")
    lines.extend(f"- {flag}" for flag in promo_flags)

    lines += ["", "## Upcoming commitments"]
    for row in upcoming:
        lines.append(
            f"- {row.get('date', '')}: **{row.get('event', '')} — {row.get('description', '')}**: "
            f"{gbp(money(row.get('amount')))} ({row.get('certainty', 'unknown')})"
        )

    lines += ["", "## Debt overview"]
    for debt in sorted(debts, key=lambda row: -money(row.get("apr_percent"))):
        lines.append(
            f"- **{debt.get('name', 'Unnamed debt')}**: balance {gbp(money(debt.get('balance')))}, "
            f"APR {money(debt.get('apr_percent')):.2f}%, minimum {gbp(money(debt.get('minimum_payment')))}."
        )

    lines += [
        "",
        "## Prototype actions",
        "1. Preserve the protected buffer before increasing optional spending.",
        "2. Model the promotional balance before its rate changes.",
        "",
        "> All people, providers, merchants, dates, and values in this report are fictional. Planning information only; not regulated financial advice.",
    ]

    REPORTS.mkdir(exist_ok=True)
    output = REPORTS / "latest-report.md"
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {output}")
    print(f"Fictional safe-to-spend: {gbp(safe_to_spend)}")


if __name__ == "__main__":
    main()
