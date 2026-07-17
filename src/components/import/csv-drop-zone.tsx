"use client";

import { useRef, useState } from "react";
import { parseCsv } from "@/services/import/parse";
import type { ParsedCsvState } from "@/components/import/types";

const SAMPLE =
  "Date,Description,Amount,Balance\n06/19/2026,Paycheck,500.00,1500.00\n06/20/2026,Groceries,-40.00,1460.00";

function load(text: string, onLoaded: (p: ParsedCsvState) => void, onError: (m: string) => void) {
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0 || rows.length === 0) {
    onError("That file has no header row or no data rows. Check it's a CSV with a header line.");
    return;
  }
  onError("");
  onLoaded({ headers, rows, text });
}

export function CsvDropZone({
  onLoaded,
  fileName,
  onFileName,
}: {
  onLoaded: (parsed: ParsedCsvState) => void;
  fileName: string | null;
  onFileName: (name: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState(SAMPLE);
  const [error, setError] = useState("");

  function readFile(file: File) {
    onFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result ?? ""), onLoaded, setError);
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          drag
            ? "border-now bg-now-tint"
            : "border-rule bg-raised hover:border-rule-strong hover:bg-raised"
        }`}
      >
        <span className="text-2xl" aria-hidden>
          ⬆
        </span>
        <span className="text-sm font-semibold text-ink/85">
          {fileName ? `Selected: ${fileName}` : "Drag a CSV here, or click to choose a file"}
        </span>
        <span className="text-xs text-muted">
          Export transactions from your bank as CSV, then drop the file here.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setPasting((p) => !p)}
        className="text-xs font-medium text-now hover:underline focus-visible:outline-none focus-visible:underline"
      >
        {pasting ? "Hide paste box" : "…or paste CSV text instead"}
      </button>

      {pasting && (
        <div className="space-y-2">
          <textarea
            className="h-28 w-full rounded-control border border-rule-strong bg-sunken px-3 py-2 font-mono text-sm text-ink"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            aria-label="Paste CSV text"
          />
          <button
            type="button"
            onClick={() => {
              onFileName("pasted.csv");
              load(pasteText, onLoaded, setError);
            }}
            className="rounded-control bg-ink px-3 py-2 text-sm font-medium text-paper hover:opacity-85"
          >
            Use pasted text
          </button>
        </div>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}
    </div>
  );
}
