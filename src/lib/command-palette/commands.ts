export type CommandGroup = "Quick actions" | "Go to book" | "View" | "Settings";

export type CommandAction = "toggle-theme" | "new-book";

export interface Command {
  id: string;
  label: string;
  /** Icon key resolved to an inline SVG by the palette; also the text fallback. */
  icon: string;
  group: CommandGroup;
  /** Book commands carry their book's color — rendered as the same dot the nav pills use. */
  color?: string;
  /** A navigation command has an href; a client-handled one has an action. */
  href?: string;
  action?: CommandAction;
}

export interface PaletteCtx {
  workspaces: { id: string; name: string; color: string }[];
  currentWorkspaceId: string | null;
}

export function buildCommands(ctx: PaletteCtx): Command[] {
  const commands: Command[] = [];
  const ws = ctx.currentWorkspaceId;
  if (ws) {
    commands.push(
      { id: "add-expense", label: "Add expense / transaction", icon: "plus", group: "Quick actions", href: `/w/${ws}/manage?add=transaction` },
      { id: "log-bill", label: "Log a new bill", icon: "bill", group: "Quick actions", href: `/w/${ws}/manage?add=bill` },
      { id: "owner-draw", label: "Pay myself from this business", icon: "draw", group: "Quick actions", href: `/w/${ws}/income` },
      { id: "import-csv", label: "Import CSV", icon: "import", group: "Quick actions", href: `/w/${ws}/import` },
    );
  }
  for (const w of ctx.workspaces) {
    commands.push({ id: `go-${w.id}`, label: `Go to ${w.name}`, icon: "book", color: w.color, group: "Go to book", href: `/w/${w.id}` });
  }
  commands.push(
    { id: "all-books", label: "All books", icon: "grid", group: "View", href: "/all" },
    { id: "tiles", label: "Side by side (tile view)", icon: "tiles", group: "View", href: "/tiles" },
    { id: "toggle-theme", label: "Switch light / dark theme", icon: "theme", group: "View", action: "toggle-theme" },
  );
  // A user with any book belongs to an org, so the create-book dialog is mounted.
  if (ctx.workspaces.length > 0) {
    commands.push({ id: "new-book", label: "New book", icon: "plus", group: "View", action: "new-book" });
  }
  commands.push(
    { id: "settings", label: "Settings", icon: "settings", group: "Settings", href: "/settings" },
    { id: "members", label: "Sharing & members", icon: "members", group: "Settings", href: "/settings/members" },
  );
  return commands;
}

/** Case-insensitive subsequence match on the label (order preserved). */
function matches(query: string, label: string): boolean {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  let i = 0;
  for (let j = 0; j < l.length && i < q.length; j++) {
    if (l[j] === q[i]) i += 1;
  }
  return i === q.length;
}

export function filterCommands(commands: Command[], query: string): Command[] {
  if (query.trim() === "") return commands;
  return commands.filter((c) => matches(query, c.label));
}
