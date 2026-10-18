import type { Condition, ContextProfile } from '../schemas/context';

/**
 * Evaluates a typed condition against the context (specification 6.3, 6.7). The result is `true`, `false`, or `null`
 * when the field the condition depends on is unknown: missing data is never silently treated as a match or a miss
 * (principle P9). Unsupported field/operator combinations are also `null`.
 */
export function evaluateCondition(c: Condition, p: ContextProfile): boolean | null {
  switch (c.field) {
    case 'purpose':
      return compareScalar(p.purpose === 'unknown' ? null : p.purpose, c);
    case 'budget':
      return compareScalar(p.budget === 'unknown' ? null : p.budget, c);
    case 'deployTarget':
      return compareScalar(p.deployTarget, c);
    case 'team.size':
      return compareScalar(p.team.size === 'unknown' ? null : p.team.size, c);
    case 'team.experience':
      return compareScalar(p.team.experience === 'unknown' ? null : p.team.experience, c);
    case 'usersNow':
      return compareNumber(p.usersNow, c);
    case 'usersIn12Months':
      return compareNumber(p.usersIn12Months, c);
    case 'monthlyCeilingUsd':
      return compareNumber(p.monthlyCeilingUsd, c);
    case 'existingStack':
      return c.op === 'includes' && typeof c.value === 'string'
        ? p.existingStack.some((o) => o.optionId === c.value)
        : null;
    case 'mustHaves':
      return c.op === 'includes' && typeof c.value === 'string' ? p.mustHaves.some((m) => m.kind === c.value) : null;
  }
}

function compareScalar(actual: string | null, c: Condition): boolean | null {
  if (actual === null || typeof c.value !== 'string') return null;
  if (c.op === 'eq') return actual === c.value;
  if (c.op === 'neq') return actual !== c.value;
  return null;
}

function compareNumber(actual: number | null, c: Condition): boolean | null {
  if (actual === null || typeof c.value !== 'number') return null;
  switch (c.op) {
    case 'eq':
      return actual === c.value;
    case 'neq':
      return actual !== c.value;
    case 'lte':
      return actual <= c.value;
    case 'gte':
      return actual >= c.value;
    default:
      return null;
  }
}

/** True only when every condition is definitely true. Unknown or false conditions do not match. */
export function allTrue(conditions: readonly Condition[], p: ContextProfile): boolean {
  return conditions.every((c) => evaluateCondition(c, p) === true);
}

/** False only when some condition is definitely false: unknown conditions keep an option in play (P9). */
export function notRuledOut(conditions: readonly Condition[], p: ContextProfile): boolean {
  return conditions.every((c) => evaluateCondition(c, p) !== false);
}
