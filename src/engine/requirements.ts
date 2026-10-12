// The order, as the engineer enters it from the approved quotation.
// This is the only input of the engine: everything else is derived from it.
import { z } from "zod";
import { DEPTHS, FORMS, HEIGHTS, INCOMERS, RATINGS } from "./system";

export const FeederSchema = z
  .object({
    id: z.string().min(1),
    tag: z.string().min(1, "Give the feeder a tag"),
    description: z.string().default(""),
    frame: z.enum(["250", "630"]),
    rating: z.number().int().positive(),
    poles: z.enum(["3P", "4P"]),
    qty: z.number().int().min(1).max(50).default(1),
  })
  .refine((f) => RATINGS[f.frame].includes(f.rating), {
    message: "Rating does not exist for this breaker frame",
    path: ["rating"],
  });

export const RequirementsSchema = z.object({
  version: z.literal(1).default(1),
  project: z.object({
    name: z.string().min(1, "Project name is required"),
    client: z.string().default(""),
    reference: z.string().default(""),
    revision: z.string().default("A"),
    drawnBy: z.string().default(""),
    date: z.string().default(""),
    notes: z.string().default(""),
  }),
  system: z.literal("TSG-F").default("TSG-F"),
  form: z.enum(FORMS),
  entry: z.enum(["bottom", "top"]),
  depth: z.number().refine((v) => (DEPTHS as readonly number[]).includes(v), "Unsupported depth"),
  height: z.number().refine((v) => (HEIGHTS as readonly number[]).includes(v), "Unsupported height"),
  incomer: z.object({
    enabled: z.boolean(),
    type: z.enum(Object.keys(INCOMERS) as [keyof typeof INCOMERS]),
  }),
  feeders: z.array(FeederSchema).max(200),
});

export type Requirements = z.infer<typeof RequirementsSchema>;
export type Feeder = z.infer<typeof FeederSchema>;

/** The reference job: the 4-feeder section the original HTML project was built around. */
export function exampleRequirements(): Requirements {
  return {
    version: 1,
    project: {
      name: "TSG-F reference section",
      client: "",
      reference: "REF-0001",
      revision: "A",
      drawnBy: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
    system: "TSG-F",
    form: "4b",
    entry: "bottom",
    depth: 600,
    height: 2000,
    incomer: { enabled: true, type: "MTZ2-16-4P-D" },
    feeders: [
      { id: "f1", tag: "F1", description: "Outgoing 1", frame: "630", rating: 630, poles: "4P", qty: 1 },
      { id: "f2", tag: "F2", description: "Outgoing 2", frame: "630", rating: 400, poles: "3P", qty: 1 },
      { id: "f3", tag: "F3", description: "Outgoing 3", frame: "250", rating: 250, poles: "4P", qty: 1 },
      { id: "f4", tag: "F4", description: "Outgoing 4", frame: "250", rating: 160, poles: "3P", qty: 1 },
    ],
  };
}

export function parseRequirements(input: unknown) {
  return RequirementsSchema.safeParse(input);
}
