# Stock Price 1.6.0

This release makes Stock Price easier to configure and more reassuring in daily use.

## What's new

- Redesigned settings with clearer Quote, Provider, Display, and Color sections.
- Finnhub is clearly identified as the recommended provider for frequent use.
- Only the selected provider's API-key controls are shown.
- New **Save & verify** action confirms whether a key and ticker work together.
- Remaining Alpha Vantage and Finnhub REST request allowances are shown in settings.
- Shared request allowances stay synchronized when switching between Stock Quote keys.
- Provider-specific refresh guidance explains streaming and free-tier behavior.
- Advanced request-safety controls are available without crowding the main setup flow.
- Successful manual refreshes show a centered green confirmation mark.
- Large, automatically fitted quote text is now used consistently.

## Reliability and privacy

- API-key errors are distinguished from invalid ticker errors.
- Legacy per-action Alpha Vantage keys are migrated and removed from exported action settings.
- Changing shared credentials no longer triggers a burst of refreshes across every visible key.
- Build dependencies are pinned for reproducible release packages.
- Plugin metadata now accurately describes both Alpha Vantage and Finnhub support.

API keys remain stored in Stream Deck's local plugin-wide settings and are sent only to the selected market-data provider.
