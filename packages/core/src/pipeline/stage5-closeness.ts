import type { Defaults } from '../schemas/config';
import type { ScoredOption } from './stage4-scoring';

export interface Closeness {
  /** Best first. Ties are broken by option id so the order is deterministic. */
  ranking: ScoredOption[];
  /** score(first) - score(second), or null when it cannot be computed (fewer than two scored options). */
  margin: number | null;
  confidence: 'clear' | 'close' | 'uncertain';
  /** The top two, plus a third only if within theta_clear of the first; at most the configured maximum (3). */
  finalists: ScoredOption[];
}

const byScoreThenId = (a: ScoredOption, b: ScoredOption): number => {
  const ta = a.score.total;
  const tb = b.score.total;
  if (ta !== null && tb !== null && ta !== tb) return tb - ta;
  if (ta === null && tb !== null) return 1;
  if (ta !== null && tb === null) return -1;
  return a.score.optionId < b.score.optionId ? -1 : a.score.optionId > b.score.optionId ? 1 : 0;
};

/**
 * Closeness and finalists (specification 6.6). margin m = score(first) - score(second).
 *   clear     if m >= theta_clear
 *   close     if theta_uncertain <= m < theta_clear
 *   uncertain if m < theta_uncertain, or if either top option carries an uncertain flag from Stages 3 or 4.
 * A lone survivor has no margin: it is clear unless it is itself uncertain. The thresholds are Defaults (config).
 */
export function stage5Closeness(
  scored: readonly ScoredOption[],
  scoring: Defaults['scoring'],
  finalistsCfg: Defaults['finalists'],
): Closeness {
  const ranking = [...scored].sort(byScoreThenId);
  const [first, second] = ranking;
  if (first === undefined) return { ranking, margin: null, confidence: 'uncertain', finalists: [] };

  const topUncertain = first.score.uncertain || (second?.score.uncertain ?? false);
  const t1 = first.score.total;
  const t2 = second?.score.total ?? null;

  let margin: number | null = null;
  let confidence: Closeness['confidence'];
  if (second === undefined) {
    confidence = first.score.uncertain || t1 === null ? 'uncertain' : 'clear';
  } else if (t1 === null || t2 === null) {
    confidence = 'uncertain'; // an option with no scorable dimension cannot be compared
  } else {
    margin = t1 - t2;
    if (topUncertain || margin < scoring.theta_uncertain) confidence = 'uncertain';
    else if (margin >= scoring.theta_clear) confidence = 'clear';
    else confidence = 'close';
  }

  const finalists = ranking.slice(0, 2);
  const third = ranking[2];
  if (
    third !== undefined &&
    finalistsCfg.third_within_theta_clear &&
    finalistsCfg.max_finalists >= 3 &&
    t1 !== null &&
    third.score.total !== null &&
    t1 - third.score.total < scoring.theta_clear
  ) {
    finalists.push(third);
  }
  return { ranking, margin, confidence, finalists: finalists.slice(0, finalistsCfg.max_finalists) };
}
