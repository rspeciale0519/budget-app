import { ZodError } from "zod";

/**
 * Turn a thrown error into a message safe to show a user.
 *
 * Services validate with Zod `.parse()`, and a `ZodError` is an `Error` whose
 * `.message` is a JSON dump of its issues. Returning that verbatim (the old
 * `e instanceof Error ? e.message` pattern) leaked raw `[{ "code": "too_small",
 * … }]` blobs into the UI. This formats a ZodError into one plain sentence and
 * passes through any other Error's message unchanged.
 */
export function actionErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    if (!first) return fallback;
    const field = first.path.filter((p) => typeof p === "string").join(" ");
    const detail = friendlyIssue(first);
    return field ? `Check "${field}" — ${detail}` : detail;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/** Zod's own issue text is engineer-facing; translate the common cases. */
function friendlyIssue(issue: { code: string; minimum?: unknown; message: string }): string {
  switch (issue.code) {
    case "too_small":
      return issue.minimum === 1 || issue.minimum === 0 ? "this can't be empty" : "this is too short";
    case "too_big":
      return "this is too long";
    case "invalid_type":
      return "please enter a valid value";
    case "invalid_string":
    case "invalid_format":
      return "this isn't in the expected format";
    default:
      return issue.message.replace(/^Invalid input:\s*/i, "").toLowerCase();
  }
}
