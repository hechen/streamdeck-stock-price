# Stock Price for Stream Deck project guidance

## Mandatory version and release workflow

- Follow shared policy revision **2026-10-21.2** in [RELEASE_POLICY.md](RELEASE_POLICY.md) and the app-specific [VERSION_PLAN.md](VERSION_PLAN.md); record owners, platform evidence and exceptions there.
- Except for the narrowly scoped main-first governance-docs exception in RELEASE_POLICY.md, every new change, including docs/release evidence, branches from its intended `version/X.Y.Z` and returns by reviewed PR. No direct commits to `main` or version branches. Resolve ambiguous/missing version lineage with the owner first.
- Promotion to `main` needs exact-version Apple approval where applicable, required tests and separate explicit merge authority. Successors wait for predecessor approval and public availability on all planned platforms unless a named user exception applies. Internal/non-App-Store gates retain their existing authority and require an explicit decision if undefined.
- Forward-port applicable fixes through separate reviewed PRs to every existing subsequent version branch; resolve conflicts, retest and track each target as merged, pending, conflict or not applicable with a reason. Prefer compatible ancestry-preserving merges; document targeted adaptations.
- Preserve immutable source/build/tag identity and separate archive, upload, processing, TestFlight, submission, approval and public-distribution evidence per platform. Check model/schema compatibility and deployment evidence before releasing a writing build without expanding schema permissions.
- Keep all existing app-specific QA, data protections, release holds and permissions. Adoption requires a verified merged PR per receiving branch; governance-docs merge authority does not authorize any application release.
