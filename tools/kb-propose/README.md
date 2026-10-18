# kb-propose

A curator helper. It can only create a **snapshot** and a **proposal**; it has no code path that writes under `kb/records/`. Only the founder promotes a reviewed proposal (rule K5, hard rule 8).

```
pnpm kb:propose snapshot <url> --id <record-id> [--force]   # fetch a public https page, save kb/snapshots/<id>.txt
pnpm kb:propose draft <spec.json> [--force]                  # write kb/proposals/<id>.yaml if it verifies
pnpm kb:propose verify <record-id>                           # re-run the quote, number and URL checks
```

Safety: only public https URLs (no credentials, no explicit port, no localhost, private, link-local or reserved addresses, no IPv6 literals); redirects are followed manually and each hop is re-validated; size (5 MB) and time (20 s) are bounded; only text/html and text/plain are read. Residual risk: DNS rebinding is not handled (a public name that resolves to a private address). The tool runs on the founder's machine and only writes text to a file, so this is accepted.

A proposal is written only if the quote appears verbatim in the snapshot, every number in the body appears in the quote, and the source URL matches the snapshotted page (specification 8.5, step 4).
