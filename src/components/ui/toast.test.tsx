import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Consumer() {
  useToast();
  return <span>inside</span>;
}

describe("ToastProvider", () => {
  it("renders children and a polite live region for announcements", () => {
    const html = renderToString(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );
    expect(html).toContain("inside");
    expect(html).toContain('aria-live="polite"');
  });

  it("useToast throws outside the provider", () => {
    expect(() => renderToString(<Consumer />)).toThrow(/inside <ToastProvider>/);
  });
});
