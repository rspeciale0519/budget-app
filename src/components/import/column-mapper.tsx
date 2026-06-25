"use client";

import type { SignRule } from "@prisma/client";
import type { DateFormat } from "@/lib/import/auto-detect";
import type { DraftMapping, ParsedCsvState } from "@/components/import/types";

const selectCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/30";

const AMOUNT_CHOICES: { rule: SignRule; label: string; hint: string }[] = [
  {
    rule: "single_signed",
    label: "One amount column (positive in, negative out)",
    hint: "Most checking/savings exports. Deposits are positive, withdrawals negative.",
  },
  {
    rule: "separate_debit_credit",
    label: "Separate Debit and Credit columns",
    hint: "Money out is in one column, money in is in another.",
  },
  {
    rule: "invert",
    label: "Credit-card export (charges shown as positive)",
    hint: "Flips signs so purchases count as spending, not income.",
  },
];

function HeaderSelect({
  label,
  hint,
  optional,
  headers,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  headers: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </span>
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{optional ? "— none —" : "— choose a column —"}</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function ColumnMapper({
  parsed,
  value,
  onChange,
}: {
  parsed: ParsedCsvState;
  value: DraftMapping;
  onChange: (next: DraftMapping) => void;
}) {
  const set = (patch: Partial<DraftMapping>) => onChange({ ...value, ...patch });
  const headers = parsed.headers;
  const first = parsed.rows[0] ?? {};
  const cellOf = (h: string) => (h ? (first[h] ?? "") : "—");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <HeaderSelect
          label="Date"
          headers={headers}
          value={value.date}
          onChange={(v) => set({ date: v })}
        />
        <HeaderSelect
          label="Description"
          headers={headers}
          value={value.description}
          onChange={(v) => set({ description: v })}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-600">How are amounts shown?</legend>
        {AMOUNT_CHOICES.map((c) => (
          <label
            key={c.rule}
            className={`flex cursor-pointer gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              value.signRule === c.rule
                ? "border-[#2563eb] bg-[#eff4ff]"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="signRule"
              className="mt-0.5"
              checked={value.signRule === c.rule}
              onChange={() => set({ signRule: c.rule })}
            />
            <span>
              <span className="font-medium text-slate-800">{c.label}</span>
              <span className="block text-[11px] text-slate-500">{c.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        {value.signRule === "separate_debit_credit" ? (
          <>
            <HeaderSelect
              label="Debit (money out)"
              headers={headers}
              value={value.debit}
              onChange={(v) => set({ debit: v })}
            />
            <HeaderSelect
              label="Credit (money in)"
              headers={headers}
              value={value.credit}
              onChange={(v) => set({ credit: v })}
            />
          </>
        ) : (
          <HeaderSelect
            label="Amount"
            headers={headers}
            value={value.amount}
            onChange={(v) => set({ amount: v })}
          />
        )}
        <HeaderSelect
          label="Running balance"
          optional
          hint="Lets us double-check the math after import."
          headers={headers}
          value={value.runningBalance}
          onChange={(v) => set({ runningBalance: v })}
        />
        <HeaderSelect
          label="Merchant"
          optional
          headers={headers}
          value={value.merchant}
          onChange={(v) => set({ merchant: v })}
        />
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">Date format</span>
        <select
          className={`${selectCls} max-w-[12rem]`}
          value={value.dateFormat}
          onChange={(e) => set({ dateFormat: e.target.value as DateFormat })}
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
        </select>
      </label>

      <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-500">First row check — </span>
        Date: <span className="font-mono text-slate-800">{cellOf(value.date)}</span> · Description:{" "}
        <span className="font-mono text-slate-800">{cellOf(value.description)}</span> · Amount:{" "}
        <span className="font-mono text-slate-800">
          {value.signRule === "separate_debit_credit"
            ? `${cellOf(value.debit)} / ${cellOf(value.credit)}`
            : cellOf(value.amount)}
        </span>
      </div>
    </div>
  );
}
