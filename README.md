# Stock Price for Stream Deck

A configurable Stream Deck plugin that displays stock prices, daily change, and weekly change using Alpha Vantage or Finnhub.

Each key can choose its own ticker, provider, refresh behavior, displayed metrics, and color palette. API keys are stored once in Stream Deck's plugin-wide settings and are never compiled into the plugin.

> This is an independent community project. It is not affiliated with Elgato, Alpha Vantage, or Finnhub. Market data may be delayed and should not be used as the sole basis for trading decisions.

## Features

- Alpha Vantage and Finnhub provider selection per key
- One shared API key per provider
- Current price and daily percentage change
- Weekly change with provider-aware behavior
- Shared Finnhub WebSocket for visible symbols
- Automatic green/red market backgrounds
- Custom up, down, and neutral colors per key
- Fixed custom-color and stock-watermark background modes
- Persistent provider-specific request budgets
- Cached quotes when a provider is unavailable
- Consistent plugin-rendered typography across existing and new keys
- Compact, Standard, and Large text presets with automatic fitting
- Offline property-inspector UI

## Requirements

- Stream Deck 7.1 or newer
- macOS 12 or newer, or Windows 10 or newer
- An API key from at least one provider:
  - [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
  - [Finnhub](https://finnhub.io/register)

## Installation

1. Download the latest `.streamDeckPlugin` package from this project's GitHub releases, or build it from source.
2. Double-click the package and approve the installation in Stream Deck.
3. Drag **Stock Quote** from the **Stock Price** category onto a key.
4. Select the key and save an API key under **Shared plugin settings**.
5. Choose the key's provider and ticker.

Provider keys are shared by every action from this plugin. You do not need to paste the same key into every Stream Deck key.

## Provider behavior

| Capability | Alpha Vantage | Finnhub |
|---|---|---|
| REST quote | One request per symbol | One initial/reference request per symbol |
| Daily change | From `GLOBAL_QUOTE` | From `/quote` and previous close |
| Live visible-price updates | No | One shared WebSocket connection |
| Weekly change | One weekly request per symbol/day, cached | Derived locally after about seven days |
| Default safety budget | 24 requests per rolling 24 hours | 50 REST requests per rolling minute |

### Alpha Vantage

The free `GLOBAL_QUOTE` endpoint accepts one symbol per request. The plugin caches quotes and weekly history, and persists a rolling request ledger across Stream Deck restarts. Its default cap of 24 stays below Alpha Vantage's published free allowance of 25 requests per day.

Alpha Vantage offers a bulk realtime endpoint for up to 100 US symbols, but that endpoint requires a premium realtime-market-data entitlement and is therefore not used automatically.

### Finnhub

The plugin makes an initial REST quote request to obtain the current price, previous close, and daily change. It then opens one shared Finnhub WebSocket connection and subscribes all currently visible Finnhub symbols. Streaming trade bursts are coalesced, and Stream Deck keys render at most once per symbol per second.

The REST reference refresh interval is clamped to at least one hour for Finnhub because streamed prices do not require repeated polling. The safety budget defaults to 50 REST requests per rolling minute, below Finnhub's published free limit of 60 calls per minute.

Finnhub's historical stock-candle endpoint is premium-only. To keep free keys functional, this plugin saves one local daily reference price and calculates weekly change when a quote at least seven days old exists. Until then, the key displays `W WAIT`.

## Key settings

- **Data provider:** Alpha Vantage or Finnhub
- **Ticker:** provider-compatible symbol such as `AAPL`, `MSFT`, or `TSLA`
- **Auto refresh:** reference-quote refresh interval or manual-only mode
- **Daily change:** show or hide the daily row
- **Weekly change:** show or hide the weekly row
- **Text size:** Compact, Standard, or Large hierarchy with automatic fitting
- **Background follows:** use daily or weekly direction for market colors
- **Background style:** market color, stock watermark, or fixed custom color
- **Up / Down / Neutral color:** independent market-mode colors
- **Custom color:** fixed background used by custom-color mode

## Status labels

| Label | Meaning |
|---|---|
| `Cached` | A fresh request failed; the last successful quote is displayed |
| `API limit` | The plugin or provider request cap blocked the quote |
| `W CAP` | Alpha Vantage's weekly request was blocked by the cap |
| `W ERR` | Weekly data failed for another API or network reason |
| `W WAIT` | Finnhub needs about seven days of local history |
| `Check symbol` | The provider did not recognize or return the ticker |
| `Set API key` | The selected provider's shared key is missing |
| `Unavailable` | A network or unclassified provider failure occurred |

## Privacy and credential handling

- API keys are entered in Stream Deck's property inspector and stored in plugin-wide global settings on the local machine.
- Keys are not present in source files, manifests, build artifacts, or logs.
- Alpha Vantage REST authentication uses its required query parameter.
- Finnhub REST authentication uses the `X-Finnhub-Token` header.
- Finnhub WebSocket authentication requires the token in the connection URL; the URL and token are never logged.
- The plugin does not transmit keys anywhere except the selected market-data provider.

Do not commit API keys, Stream Deck profiles, plugin settings, or diagnostic archives to GitHub.

## Build from source

The current Elgato SDK requires Node.js 24 or newer.

```bash
npm install
npm run build
npm run validate
npm run pack
```

The packaged installer is written as `com.chen.stock-price.streamDeckPlugin`.

Useful development commands:

```bash
npx streamdeck link com.chen.stock-price.sdPlugin
npx streamdeck restart com.chen.stock-price
```

## Project structure

```text
src/
  finnhub-stream.ts       Shared WebSocket and symbol subscriptions
  market-data.ts          Provider clients, caches, history, and budgets
  stock-price-action.ts   Stream Deck lifecycle, rendering, and settings
  plugin.ts               Plugin registration
com.chen.stock-price.sdPlugin/
  manifest.json
  imgs/
  ui/
```

## Development notes

- Provider calls are serialized before request-ledger updates to avoid concurrent keys bypassing limits.
- Caches are provider-qualified, so the same ticker can use both providers without collisions.
- Streamed Finnhub prices are intentionally not persisted on every trade; daily reference snapshots are persisted instead.
- Key faces are rendered as complete SVG data images. This avoids inconsistent font settings retained by older Stream Deck profiles.
- Existing Alpha Vantage per-action keys from early plugin versions are migrated to shared settings when encountered.

## License

MIT. See [LICENSE](LICENSE).
