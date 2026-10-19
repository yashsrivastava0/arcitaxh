import { z } from 'zod';
import { decisionTypeIdSchema, graphIdSchema, optionRefSchema } from './common';

/** Palette v1 (spec 5.4). `custom` is the free-text box; the engine classifies it or asks. */
export const PALETTE_TYPES = [
  'database',
  'cache',
  'queue',
  'agent_runtime',
  'vector_store',
  'model_provider',
  'embedding_model',
  'object_storage',
  'api',
  'client',
  'authentication',
  'observability',
] as const;
export const paletteTypeSchema = z.enum(PALETTE_TYPES);
export type PaletteType = z.infer<typeof paletteTypeSchema>;
export const componentTypeSchema = z.enum([...PALETTE_TYPES, 'custom']);

/** Design-shape limits. Defaults live in config/defaults/rules.json; callers pass them in. */
export interface DesignLimits {
  maxComponents: number;
  maxEdges: number;
  maxLabelChars: number;
  maxNoteChars: number;
}

/**
 * Traits (spec 5.4). The first four are the specification's. `holdsConversation` and `contextPolicy` are not: rule R-03
 * ("a conversation or memory store has no truncation or summary policy", spec 7.2) has no field to read, so they are
 * added as optional user declarations (conflict C-019). Optional fields left out never reach a hash.
 */
const traitsSchema = z.strictObject({
  onRequestPath: z.boolean().optional(),
  longRunning: z.boolean().optional(),
  readRatio: z.number().min(0).max(1).optional(),
  hasFailover: z.boolean().optional(),
  holdsConversation: z.boolean().optional(),
  contextPolicy: z.enum(['none', 'window', 'summary']).optional(),
});

/** Component (spec 5.4). `position` is layout only: excluded from every rule and every hash (I5). */
function createComponentSchema(limits: Pick<DesignLimits, 'maxLabelChars'>) {
  return z.strictObject({
    id: graphIdSchema,
    type: componentTypeSchema,
    label: z.string().min(1).max(limits.maxLabelChars),
    status: z.enum(['decided', 'suggested', 'undecided']),
    decisionType: decisionTypeIdSchema.nullable(),
    choice: optionRefSchema.nullable(),
    classification: z.enum(['classified', 'unclassified', 'user_confirmed']),
    traits: traitsSchema,
    position: z.strictObject({ x: z.number().finite(), y: z.number().finite() }),
  });
}
export type Component = z.infer<ReturnType<typeof createComponentSchema>>;

/** Edge (spec 5.4): a directed dependency, sync or async. */
function createEdgeSchema(limits: Pick<DesignLimits, 'maxNoteChars'>) {
  return z.strictObject({
    id: graphIdSchema,
    from: graphIdSchema,
    to: graphIdSchema,
    mode: z.enum(['sync', 'async']),
    timeoutMs: z.number().int().positive().optional(),
    retries: z.number().int().nonnegative().optional(),
    note: z.string().max(limits.maxNoteChars).optional(),
  });
}
export type Edge = z.infer<ReturnType<typeof createEdgeSchema>>;

export type InvariantCode = 'I1' | 'I2' | 'I3' | 'I7' | 'LIMIT_EDGES';

export interface Violation {
  invariant: InvariantCode;
  path: (string | number)[];
  message: string;
}

interface GraphShape {
  nodes: readonly { id: string; status: string; choice: unknown }[];
  edges: readonly { id: string; from: string; to: string }[];
}

/**
 * Design invariants that need more than one field (spec 5.4):
 *  I1 every edge endpoint refers to an existing component
 *  I2 ids are unique within a design
 *  I3 a decided component has a choice
 *  I7 at most `maxComponents` components (and `maxEdges` edges, our own bound)
 * Not checked here: I4 (option exists in the KB; needs a KBReader, see findUnknownOptions), I5 (positions never
 * affect semantics; enforced by normalisation and the hash tests), I6 (cycles are allowed; rule R-01.. reports
 * them), I8 (free-text length limits; enforced by the schema, and text reaches models only as data blocks).
 */
export function checkInvariants(
  graph: GraphShape,
  limits: Pick<DesignLimits, 'maxComponents' | 'maxEdges'>,
): Violation[] {
  const out: Violation[] = [];
  const nodeIds = new Set<string>();
  graph.nodes.forEach((n, i) => {
    if (nodeIds.has(n.id))
      out.push({ invariant: 'I2', path: ['nodes', i, 'id'], message: `duplicate component id "${n.id}"` });
    nodeIds.add(n.id);
    if (n.status === 'decided' && n.choice === null) {
      out.push({ invariant: 'I3', path: ['nodes', i, 'choice'], message: `decided component "${n.id}" has no choice` });
    }
  });
  const edgeIds = new Set<string>();
  graph.edges.forEach((e, i) => {
    if (edgeIds.has(e.id))
      out.push({ invariant: 'I2', path: ['edges', i, 'id'], message: `duplicate edge id "${e.id}"` });
    edgeIds.add(e.id);
    if (!nodeIds.has(e.from))
      out.push({
        invariant: 'I1',
        path: ['edges', i, 'from'],
        message: `edge "${e.id}" starts at unknown component "${e.from}"`,
      });
    if (!nodeIds.has(e.to))
      out.push({
        invariant: 'I1',
        path: ['edges', i, 'to'],
        message: `edge "${e.id}" ends at unknown component "${e.to}"`,
      });
  });
  if (graph.nodes.length > limits.maxComponents) {
    out.push({
      invariant: 'I7',
      path: ['nodes'],
      message: `a design holds at most ${limits.maxComponents} components (has ${graph.nodes.length})`,
    });
  }
  if (graph.edges.length > limits.maxEdges) {
    out.push({
      invariant: 'LIMIT_EDGES',
      path: ['edges'],
      message: `a design holds at most ${limits.maxEdges} edges (has ${graph.edges.length})`,
    });
  }
  return out;
}

/** The design graph schema for the given limits. Invariant failures are reported as issues with an "I<n>:" prefix. */
export function createDesignGraphSchema(limits: DesignLimits) {
  return z
    .strictObject({
      nodes: z.array(createComponentSchema(limits)),
      edges: z.array(createEdgeSchema(limits)),
    })
    .superRefine((graph, ctx) => {
      for (const v of checkInvariants(graph, limits)) {
        ctx.addIssue({ code: 'custom', message: `${v.invariant}: ${v.message}`, path: v.path });
      }
    });
}
export type DesignGraph = z.infer<ReturnType<typeof createDesignGraphSchema>>;

export interface DesignIssue {
  path: string;
  message: string;
  /** Present when the issue is a named invariant (I1, I2, I3, I7). */
  invariant: InvariantCode | null;
}

export type ParseDesignResult = { success: true; data: DesignGraph } | { success: false; issues: DesignIssue[] };

/** Parses untrusted input into a DesignGraph, flattening failures into plain issues. */
export function parseDesign(input: unknown, limits: DesignLimits): ParseDesignResult {
  const r = createDesignGraphSchema(limits).safeParse(input);
  if (r.success) return { success: true, data: r.data };
  return {
    success: false,
    issues: r.error.issues.map((i) => {
      const m = /^(I\d|LIMIT_EDGES):/.exec(i.message);
      return { path: i.path.join('.'), message: i.message, invariant: (m?.[1] as InvariantCode | undefined) ?? null };
    }),
  };
}
