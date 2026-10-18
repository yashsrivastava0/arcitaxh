// The fake fixture KB (kb/fixtures, generated into fixture-bundle.json by `pnpm kb:schema`) and the real defaults, for
// golden tests. Everything in the bundle is FAKE: vendor.example, quotes prefixed "FAKE FIXTURE".
import cost from '../../../../config/defaults/cost.json';
import debate from '../../../../config/defaults/debate.json';
import finalists from '../../../../config/defaults/finalists.json';
import freshness from '../../../../config/defaults/freshness.json';
import retention from '../../../../config/defaults/retention.json';
import rules from '../../../../config/defaults/rules.json';
import scoring from '../../../../config/defaults/scoring.json';
import { createBundleReader } from '../kb-bundle/reader';
import { parseBundle, type KbBundle } from '../kb-bundle/bundle';
import type { Clock } from '../ports';
import { parseDefaults, type Defaults } from '../schemas/config';
import bundleJson from './fixture-bundle.json';

export const DEFAULTS: Defaults = parseDefaults({ scoring, finalists, rules, freshness, debate, cost, retention });

export const FIXTURE_BUNDLE: KbBundle = parseBundle(bundleJson);
export const FIXTURE_KB = createBundleReader(FIXTURE_BUNDLE);

/** Every fixture record was verified on 2026-10-18; this is two days later, so all are fresh. */
export const CLOCK_FRESH: Clock = { now: () => '2026-10-20T08:00:00.000Z' };
/** After every fixture record's valid_until (the latest is 2027-01-16): everything has expired. */
export const CLOCK_EXPIRED: Clock = { now: () => '2027-03-01T08:00:00.000Z' };
/** Eleven days before the 14-day latency profiles expire... used for due-soon checks. */
export const clockAt = (date: string): Clock => ({ now: () => `${date}T08:00:00.000Z` });

/** Option ids in the fixture world. */
export const OPT = {
  existing: 'option.existing-db-extension',
  a: 'option.managed-service-a',
  b: 'option.managed-service-b',
  c: 'option.self-hosted-c',
} as const;
