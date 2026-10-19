import { assessFreeTier, formatMultiple, growthFactor } from '../calc/free-tier';
import { freeTierLimits } from '../calc/scale';
import { dateOfTimestamp } from '../util/date';
import type { Rule } from './types';
import { detected, nameList, unknownFinding } from './types';
import { decided, design } from './fixtures/builders';

// R-07: a component's free-tier breakpoint (L / u1, specification 7.7) is below the 12-month scale, so the free tier will
// run out within a year. The 12-month scale is the user's own figure (requests per day, else users, now vs in 12 months);
// nothing is invented. Under missing data (P9):
//  - usage already above the limit is conclusive whatever the growth;
//  - no usage figure for the limit's metric, no growth figure to project it, or an expired limit record is NOT a pass:
//    one `unknown` finding says which, and names the components.
// With a free-tiers-only budget the wording is stronger; the severity is the specification's `warn`.
export const R07: Rule = {
  id: 'R-07',
  version: '0.1.0',
  title: 'Free tier reached within 12 months',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph, profile, usage, kb, clock, defaults }) {
    const ctx = { today: dateOfTimestamp(clock.now()), dueSoonDays: defaults.freshness.due_soon_days };
    const growth = growthFactor(profile, usage);
    const horizon = defaults.rules.free_tier_horizon_months;
    const freeOnly = profile.budget === 'free_only';
    const limits = freeTierLimits(graph, kb, ctx);
    const byComponent = new Map<string, typeof limits>();
    for (const l of limits) byComponent.set(l.componentId, [...(byComponent.get(l.componentId) ?? []), l]);

    const out = [];
    const cannotTell: { label: string; id: string; why: string; recordIds: string[] }[] = [];
    for (const [componentId, ls] of [...byComponent].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      const label = ls[0]?.label ?? componentId;
      const expired = ls.filter((l) => l.expired);
      const current = ls.filter((l) => !l.expired);
      const assessment = assessFreeTier(
        current.map((l) => l.record),
        usage,
        growth,
      );
      if (assessment.state === 'exceeds') {
        const worst = assessment.limits
          .filter((l) => l.state === 'exceeds')
          .sort((a, b) => (a.breakpoint ?? 0) - (b.breakpoint ?? 0) || (a.recordId < b.recordId ? -1 : 1))[0];
        if (worst === undefined) continue;
        const already = worst.usageNow !== null && worst.usageNow > worst.limit;
        const when = already
          ? `already above the free limit of ${worst.limit} for ${worst.metric}`
          : `reached within ${horizon} months at your growth (it runs out at about ${formatMultiple(worst.breakpoint ?? 0)} times today's usage)`;
        out.push(
          detected(R07, {
            componentIds: [componentId],
            severity: 'warn',
            title: freeOnly
              ? 'The free tier will not last, and you asked for free tiers only'
              : 'Free tier reached within 12 months',
            explanation:
              `${label}'s free tier is ${when}. ` +
              (freeOnly
                ? 'You asked for free tiers only, so this option stops fitting your budget.'
                : 'After that you pay, or hit the limit.') +
              ' Usage is assumed to grow in proportion to traffic.',
            suggestedFix: 'Paid tier, or the next option',
            recordIds: [worst.recordId],
            measurements: {
              limit: worst.limit,
              usageNow: worst.usageNow ?? 'not given',
              breakpoint: worst.breakpoint ?? 'not given',
              growthFactor: growth ?? 'not given',
            },
          }),
        );
        continue;
      }
      if (assessment.state === 'unknown' || expired.length > 0) {
        const noUsage = assessment.limits.filter((l) => l.usageNow === null);
        const reasons: string[] = [];
        if (expired.length > 0) {
          reasons.push(
            current.length === 0 ? 'its free-tier record has expired' : 'one of its free-tier records has expired',
          );
        }
        if (noUsage.length > 0) {
          reasons.push(`no usage figure is given for ${nameList(noUsage.map((l) => l.metric))}`);
        } else if (assessment.state === 'unknown' && current.length > 0) {
          reasons.push('there is no growth figure to project usage 12 months out');
        }
        cannotTell.push({ label, id: componentId, why: reasons.join(' and '), recordIds: ls.map((l) => l.record.id) });
      }
    }
    if (cannotTell.length > 0) {
      out.push(
        unknownFinding(R07, {
          componentIds: cannotTell.map((c) => c.id),
          title: 'Could not check whether a free tier will last 12 months',
          explanation:
            cannotTell.map((c) => `${c.label}: ${c.why}.`).join(' ') + ' A missing figure is not treated as "fine".',
          suggestedFix: 'Give your current usage for each limit, and your traffic now and in 12 months',
          recordIds: cannotTell.flatMap((c) => c.recordIds),
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'free tier of 50,000 vectors, usage 20,000 and 10x growth: runs out at 2.5x (fires)',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-a')]),
      profile: { usersNow: 500, usersIn12Months: 5000 },
      usage: { metrics: { stored_vectors: 20000 } },
      expect: [
        {
          ruleId: 'R-07',
          kind: 'detected',
          severity: 'warn',
          componentIds: ['vec'],
          suggestedFix: 'Paid tier, or the next option',
          evidence: {
            recordIds: ['limit.managed-service-a.free-tier.2026-10'],
            measurements: { limit: 50000, usageNow: 20000, breakpoint: 2.5, growthFactor: 10 },
          },
        },
      ],
    },
    {
      name: 'the same with a free-tiers-only budget: stronger wording, same severity (fires)',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-a')]),
      profile: { usersNow: 500, usersIn12Months: 5000, budget: 'free_only' },
      usage: { metrics: { stored_vectors: 20000 } },
      expect: [
        {
          ruleId: 'R-07',
          kind: 'detected',
          severity: 'warn',
          title: 'The free tier will not last, and you asked for free tiers only',
        },
      ],
    },
    {
      name: 'a free tier of 1,000,000 vectors easily covers 10x of 20,000 (does not fire)',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-b')]),
      profile: { usersNow: 500, usersIn12Months: 5000 },
      usage: { metrics: { stored_vectors: 20000 } },
      expect: [],
    },
    {
      name: 'usage already above the limit is conclusive even with no growth figure (fires)',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-a')]),
      usage: { metrics: { stored_vectors: 60000 } },
      expect: [{ ruleId: 'R-07', kind: 'detected', componentIds: ['vec'] }],
    },
    {
      name: 'no usage figure: unknown, not a pass',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-a')]),
      profile: { usersNow: 500, usersIn12Months: 5000 },
      expect: [{ ruleId: 'R-07', kind: 'unknown', severity: 'info', componentIds: ['vec'] }],
    },
    {
      name: 'a usage figure but no growth figure: cannot say the tier lasts, so unknown',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-a')]),
      usage: { metrics: { stored_vectors: 20000 } },
      expect: [{ ruleId: 'R-07', kind: 'unknown', componentIds: ['vec'] }],
    },
    {
      name: 'the free-tier record has expired: not used, so unknown even though the numbers would fire',
      graph: design([decided('vec', 'vector_store', 'option.managed-service-a')]),
      profile: { usersNow: 500, usersIn12Months: 5000 },
      usage: { metrics: { stored_vectors: 20000 } },
      today: '2027-03-01',
      expect: [{ ruleId: 'R-07', kind: 'unknown', componentIds: ['vec'] }],
    },
    {
      name: 'a component with no chosen option has no free tier to check (does not fire)',
      graph: design([decided('vec', 'vector_store', 'option.does-not-exist')]),
      usage: { metrics: { stored_vectors: 20000 } },
      expect: [],
    },
  ],
};
