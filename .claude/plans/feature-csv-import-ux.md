# feature-csv-import-ux

**Goal:** Make CSV Import approachable. Replace the paste-a-blob + type-exact-column-names
form with a guided 3-step wizard that uses the (already capable) backend properly.

**Branch:** `feature/csv-import-ux` → test → merge to main (no PR, per solo-dev workflow).

## Current pain (all frontend)
- Input is a textarea pre-filled with sample text; no file upload.
- Column mapping = free-text inputs; user must type exact header strings.
- Sign rule shows raw enum (`single_signed`/`invert`/`separate_debit_credit`); debit/credit
  columns the backend supports are not exposed at all → `separate_debit_credit` is unusable.
- Date format is a manual select; nothing is auto-detected.
- Review is a flat checkbox list with no summary.

Backend (`src/services/import/*`) already provides headers (`parseCsv`), debit/credit/merchant
columns, sign rules, dedupe, reconcile, and category-rule proposals. Reuse all of it.

## Phase 1 — Detection helpers (pure + tested)
- Create `src/lib/import/auto-detect.ts`:
  - `guessColumns(headers): DetectedMapping` — synonym match (date/description/amount/debit/
    credit/merchant/runningBalance).
  - `guessDateFormat(samples): "MM/DD/YYYY"|"DD/MM/YYYY"|"YYYY-MM-DD"`.
  - `guessSignRule(detected): SignRule` — debit&credit present → separate; else single_signed.
- `src/lib/import/auto-detect.test.ts` covering each guess.

## Phase 2 — Richer preview data
- Extend `previewImportAction` result rows with `merchant`, `isTransfer`, `category` (name via
  `listCategories` id→name map); add `summary {total,newCount,duplicateCount,errorCount}`.
- Keep `commitImportAction`/`undoImportAction` contracts.

## Phase 3 — Components (each < 450 LOC)
- `csv-drop-zone.tsx` — drag/drop + click file picker (accept .csv) + "paste instead" fallback;
  reads file text, calls `parseCsv` (client import of `@/services/import/parse`), returns
  `{headers, rows, text}`.
- `column-mapper.tsx` — header dropdowns prefilled by `guessColumns`; plain-language amount
  question driving sign rule + conditional debit/credit selectors; date-format select prefilled
  by `guessDateFormat`; live tiny sample preview.
- `import-preview.tsx` — summary chips + row list (date · desc · category · amount, duplicate/
  error badges, include checkboxes); Commit / Undo.
- `import-wizard.tsx` — orchestrator: stepper (Upload → Map → Review), account selector with
  empty-state guidance, holds state, calls actions.

## Phase 4 — Verify
- `npm run type-check`, `npm run lint`, `npm run test` (auto-detect tests green).
- Browser smoke test the Import page (local dev): upload a CSV, confirm auto-map, preview, commit, undo.
- Merge to main + push.
