# Record envelope (specification 8.3)

Every record has the same envelope. The body depends on `type`. This example uses placeholders on purpose: the release check fails on any placeholder in a record used by a launch decision type, and the vendor is fake.

```yaml
id: vs.option-a.free-tier.2026-10        # stable id, unique within a release
type: limit                              # option | limit | price | capability | latency_profile |
                                         # tradeoff | flip | guidance | antipattern
decision_type: vector-store
subject: option.option-a                 # what the record is about
body:                                    # typed per record type (see bodies-and-enums.md)
  scope: free_tier
  metric: stored_vectors
  value: "<number copied from the source>"   # placeholder; the release check rejects it
  period: none
  overage_behaviour: hard_stop
  pauses_after_inactivity: false
source:
  url: https://vendor.example/pricing
  quote: "<exact sentence copied from the page>"
  retrieved_on: 2026-10-18
verification:
  last_verified: 2026-10-18              # set by the founder on promotion
  valid_until: 2026-11-17                # last_verified + TTL for the type
  verified_by: founder                   # null while status is proposed
curator_note: "Two free-tier figures on the page; the plan table value is used."
```

A proposal adds `status: proposed` and keeps `verified_by`, `last_verified`, `valid_until` null. Zod schemas in `packages/kb` are the source of truth; `kb/schema/*.json` is generated from them.

The `id` contains the vendor-neutral option id, the facet and a year-month so a re-verified record can be told apart in reviews. Citations (`citedRecordIds`) refer to these ids, and every cited id must exist in the release.
