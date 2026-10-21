# Shared version and release policy

Policy revision: **2026-10-21.1**. App-specific state, owners, exceptions and adoption status: [VERSION_PLAN.md](VERSION_PLAN.md). Mandatory entry point: [AGENTS.md](AGENTS.md).

## Authority and adoption

Chen approved a documentation-only draft-PR rollout of this policy. That approval permits preparing the documentation and establishing a missing branch for an unambiguously active version from verified lineage. It does not approve a new roadmap version, application-code forward ports, merging, uploading, submission, public release, schema deployment, pricing/privacy/security changes or agreements.

These documents are proposed until their PR is separately reviewed and merged. Record adoption per target branch; do not call the repository-wide rollout effective merely because a draft exists. Chen's current instructions prevail over older documents. Preserve historical release records and identify drift instead of rewriting past events. App-specific QA, manual holds, schema authority and release permissions remain in force.

## Version branches and new changes

1. Each authorized version has a dedicated `version/X.Y.Z` branch and a plan naming its scope, accountable owner, target platforms, predecessor, independent platform evidence and applicable permissions. Unknown fields remain explicitly unknown with an owner responsible for resolving them; a roadmap mention is not authorization.
2. Every new change, including documentation and release evidence, starts on a separate feature/fix/docs branch from the intended version branch and returns through a reviewed PR to that same version branch. No direct commits to `main` or a version branch. Existing historical commits are not rewritten.
3. If a version branch is absent, verify the intended version and exact existing lineage before establishing it. Record the source ref and full commit. If either is ambiguous, stop that migration and ask the responsible owner to decide. Do not silently select the default branch, retarget an existing PR, or combine unrelated feature work.
4. Promote a version into `main` only when Apple approval covers that exact version on its applicable planned App Store platforms, applicable tests pass with honest limits, and explicit merge authority exists. Apple approval alone is not permission to merge. Use a separately reviewed promotion PR; preserve manual release holds.
5. Start a successor only after its predecessor is approved and publicly available on every planned platform, unless a specifically documented user exception names the versions and permitted early work. An exception to starting work does not waive tests, schema checks, submission, promotion or public-release authority. Existing early branches are recorded as drift or exceptions, not erased or treated as fresh permission.
6. Internal-only and non-App-Store products retain their existing delivery and merge permissions. Do not invent Apple/public availability requirements for those channels. Record the actual release authority and the decision needed for any undefined promotion or successor gate; unresolved gates require owner direction, not inferred permission.

## Forward integration

For every applicable fix, enumerate **all existing subsequent version branches**, including legacy release branches awaiting migration. Forward-port through a separate reviewed PR per target, resolve conflicts and retest affected behavior on that target. The ledger records source PR/commit, target, owner, method, validation, PR and status: `merged`, `pending`, `conflict`, or `not applicable` with a reason. A shared fix is not complete until every target is accounted for.

Prefer ancestry-preserving merges where compatible. If a full merge would import incorrect version/build metadata or unrelated work, use a documented targeted cherry-pick or adaptation, retaining the original commit identity, rationale and target-specific validation. Do not infer equivalence solely from ancestry or assume a cherry-pick needs no tests. This documentation rollout records follow-up only; it does not forward-port application code.

## Immutable release identity and platform evidence

Record full source commit, version/build, signed artifact hashes, platform, tooling, timestamp and existing tag convention for each candidate. The documentation branch base is **not** proof of the source used to build a binary. Preserve immutable tags, archives and source identity; never move a tag or relabel an old artifact as a new build. Later evidence-only commits do not change a build's source. Verify remote tag identity where the app requires tags.

Track these stages independently for each platform: archive/export; upload receipt; Apple processing; internal/external TestFlight availability; App Review submission and exact item list; Apple approval; public distribution. A build upload does not prove processing or group availability; approval does not prove public distribution. Keep app, IAP and event states separate. Preserve each platform's automatic/manual/phased release setting. A status snapshot is dated evidence, not ongoing monitoring.

Keep existing app-specific tests and current user exceptions. Record passed, failed, pending, blocked and not-applicable checks honestly; reuse unchanged valid evidence only under the app's existing QA policy. Builds, static checks, simulated output and locked UI sessions do not become native interactive validation. Preserve required public-release Xcode/archive checks, IAP requirements and paid-test permissions. This policy does not add a blanket purchase-runtime gate or remove an existing applicable gate.

## Models, schemas and data

Before releasing a build that writes changed models, verify compatibility with supported clients and stored data; inspect the required live schema and deployment evidence; record candidate-specific validation and device-sync limits. Follow the app's existing deployment authority. Compatible/additive standing permission in one app does not grant permission in another. Do not redeploy unchanged schemas, reset environments, delete records or broaden deployment permissions through this policy. Resolve destructive/incompatible changes through the app's separately authorized plan.

## Review checklist

- Confirm the version, owner, platform scope, branch base and any early-start exception.
- Review only intended changes; preserve unrelated work and secrets outside Git.
- Verify links, revision consistency and the forward-integration ledger.
- Confirm applicable QA and release/schema authority without claiming unknown evidence.
- Record draft, review and merge status per branch. No rollout claim extends beyond verified adoption.
