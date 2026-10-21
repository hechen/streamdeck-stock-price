# Stock Price for Stream Deck version plan

Shared policy revision: **2026-10-21.3**. Rules: [RELEASE_POLICY.md](RELEASE_POLICY.md). Entry point: [AGENTS.md](AGENTS.md).

## Adoption and responsibility

- Status: governance adoption on this receiving branch is established only by the merged replacement PR; open PRs remain pending. Other branches require separate verified adoption. Release ownership is unchanged.
- Accountable owner / decision route: Chen; existing task “Elgato Plugin Dev”.
- Repository: `hechen/streamdeck-stock-price`. Non-App-Store product; Apple release gates are not applicable.
- Active version covered: **1.6.0**. Target: `version/1.6.0`. Scope: Existing package version 1.6.0; no new marketplace release or product scope.
- Planned/recorded platforms: Stream Deck plugin; host/platform packaging remains as existing manifest. Confirm any unrecorded platform scope with Chen; an ASC draft alone does not authorize it.
- Documentation lineage: `main` at `928d0a5805419c27b85c35ec00aee1aa3c0aa688` (verified remote snapshot, 2026-10-21 UTC). This is the integration/documentation base, **not a claim about signed-build source**.
- Docs branch: `docs/shared-release-policy-20261021`. A missing version branch may be established at the exact verified base above for this already-active version only.
- Approval scope: Chen explicitly authorized documentation-only main adoption and fan-out on 2026-10-21. See the bounded exception in RELEASE_POLICY.md. No application merge, successor version or release is authorized.

## Scope and existing records

- [README.md](README.md) — existing scope/history; retain dated evidence and its limits.
- [RELEASE_NOTES_1.6.0.md](RELEASE_NOTES_1.6.0.md) — existing scope/history; retain dated evidence and its limits.

## Dated discovery snapshot and migration (2026-10-21, before main adoption)

Existing documentation was committed on main. Preserve history; new docs use the version branch/PR path. This is a non-App-Store product and has no ASC app mapping.

Preserve existing Elgato Marketplace permissions. Apple approval is not a gate for this product. Chen must identify the applicable marketplace approval/publication evidence and explicit promotion/successor authority before those steps. No marketplace resubmission, release publication or API-key changes.

## Independent release evidence

No ASC records apply. Marketplace stage evidence and channel-specific permissions must be supplied by Chen/the existing owner before promotion or publication.

Use one ledger row per exact candidate **and platform**. Preserve signed artifact hashes/source tags in the linked release reports; never substitute the docs base. The owner must fill unknown fields before the corresponding authorized stage. Existing reports remain the source of previously completed evidence; this documentation run did not repeat release verification.

| Platform/candidate | Source + tag + artifact hashes | Archive/export | Upload | Processing | TestFlight/channel availability | Submission | Approval | Public distribution |
|---|---|---|---|---|---|---|---|---|
| Existing product platforms: candidate must be selected by owner | Refer to exact release report; unknown if absent | Not refreshed | Not refreshed | Not refreshed | Not refreshed | Separate from version-state snapshot | Separate exact-version evidence required where applicable | Not independently verified here |

Archive/upload/processing/TestFlight fields above are not a claim that those stages failed or never happened. Keep prior evidence and refresh only what the app’s QA and release policy requires. Model/schema compatibility, deployment evidence and device-sync limits must accompany any writing candidate under existing app-specific authority.

## Forward-integration and adoption ledger

No application-code forward port is performed in this rollout. Recheck branch tips and all later targets when a fix changes. The initial rows track this documentation proposal and known migration obligations, not completed code integration.

| Target | Status | Reason / method / responsible owner |
|---|---|---|
| version/1.6.0 | pending | Documentation review/merge after exact-base branch creation; no merged adoption claimed. |
| Subsequent version branches | not applicable | No later dedicated version/release branch was verified in the inspected remote inventory for this active line. Re-inventory local/remote targets with the owner for every fix; this is not a blanket exemption for future branches. |
| main | pending until this PR merges | Explicitly authorized governance-only replacement PR from current main; no version promotion. See the PR merge record for its exact commit. |

## Remaining decisions

Chen and the identified owner resolve unconfirmed scope/ownership, lineage drift, applicable predecessor exceptions and release evidence. The bounded governance-docs merge authorization does not permit application merges, uploads, submissions, publication, schema deployment or store configuration changes. Record the PR URL and merged commit in this ledger only when verified.

## Main-first governance adoption

This proposal replaces [the original version-based documentation PR](https://github.com/hechen/streamdeck-stock-price/pull/1) with an isolated docs-only change from current main `928d0a5805419c27b85c35ec00aee1aa3c0aa688`. The original version-line snapshot above remains dated context, not a claim that its application code is on main. Current receiving branch: `main`; integration branch: `docs/policy-main-20261021`. Version/feature fan-out remains separate and preserves each target’s own scope and release evidence. The replacement PR and subsequent integration PR merge records are the adoption evidence; do not infer repository-wide completion from this file.
