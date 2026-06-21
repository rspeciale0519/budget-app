import { z } from "zod";

export type PaneConfig =
  | { type: "leaf"; workspaceId: string }
  | { type: "split"; direction: "row" | "col"; children: PaneConfig[]; sizes?: number[] };

export const paneConfigSchema: z.ZodType<PaneConfig> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("leaf"), workspaceId: z.string().min(1) }),
    z.object({
      type: z.literal("split"),
      direction: z.enum(["row", "col"]),
      children: z.array(paneConfigSchema).min(1),
      sizes: z.array(z.number().positive()).optional(),
    }),
  ]),
);
