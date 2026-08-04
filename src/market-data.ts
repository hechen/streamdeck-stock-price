import streamDeck from "@elgato/streamdeck";

export type DataProvider = "alphaVantage" | "finnhub";

type PricePoint = { price: number; fetchedAt: number };

export type GlobalSettings = {
  apiKey?: string;
  finnhubApiKey?: string;
  dailyRequestLimit?: number;
  requestTimestamps?: number[];
  finnhubMinuteLimit?: number;
  finnhubRequestTimestamps?: number[];
  quoteCache?: Record<string, QuoteSnapshot>;
  weeklyCache?: Record<string, WeeklySnapshot>;
  priceHistory?: Record<string, PricePoint[]>;
};

export type QuoteSnapshot = {
  symbol: string;
  price: number;
  dailyPercent: number;
  previousClose?: number;
  fetchedAt: number;
};

export type WeeklySnapshot = { weeklyPercent: number; fetchedAt: number };

type AlphaVantageQuote = {
  "Global Quote"?: { "05. price"?: string; "10. change percent"?: string };
  Information?: string;
  Note?: string;
  "Error Message"?: string;
};

type AlphaVantageWeekly = {
  "Weekly Time Series"?: Record<string, { "4. close"?: string }>;
  Information?: string;
  Note?: string;
  "Error Message"?: string;
};

type FinnhubQuote = {
  c?: number;
  dp?: number;
  pc?: number;
  error?: string;
};

export class RequestLimitError extends Error {}
export class MissingApiKeyError extends Error {}
export class ProviderError extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DEFAULT_ALPHA_DAILY_LIMIT = 24;
const DEFAULT_FINNHUB_MINUTE_LIMIT = 50;

export class MarketDataService {
  private queue: Promise<void> = Promise.resolve();

  async getQuote(provider: DataProvider, symbol: string, legacyApiKey?: string, force = false): Promise<QuoteSnapshot> {
    return this.serialized(async () => {
      let settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      settings = await this.migrateLegacyKey(settings, legacyApiKey);
      const key = this.cacheKey(provider, symbol);
      const cached = settings.quoteCache?.[key] ?? (provider === "alphaVantage" ? settings.quoteCache?.[symbol] : undefined);
      if (!force && cached && Date.now() - cached.fetchedAt < 30_000) return cached;

      const snapshot = provider === "finnhub"
        ? await this.fetchFinnhubQuote(settings, symbol)
        : await this.fetchAlphaQuote(settings, symbol);

      const latest = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      const update: GlobalSettings = {
        ...latest,
        quoteCache: { ...(latest.quoteCache ?? {}), [key]: snapshot },
      };
      if (provider === "finnhub") {
        const previous = latest.priceHistory?.[key] ?? [];
        const today = new Date(snapshot.fetchedAt).toISOString().slice(0, 10);
        const history = previous
          .filter((point) => new Date(point.fetchedAt).toISOString().slice(0, 10) !== today)
          .concat({ price: snapshot.price, fetchedAt: snapshot.fetchedAt })
          .filter((point) => point.fetchedAt > Date.now() - 35 * DAY_MS)
          .slice(-35);
        update.priceHistory = { ...(latest.priceHistory ?? {}), [key]: history };
      }
      await streamDeck.settings.setGlobalSettings(update);
      return snapshot;
    });
  }

  async getWeeklyChange(provider: DataProvider, symbol: string, legacyApiKey?: string): Promise<number | undefined> {
    return this.serialized(async () => {
      let settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      settings = await this.migrateLegacyKey(settings, legacyApiKey);
      const key = this.cacheKey(provider, symbol);

      if (provider === "finnhub") {
        const quote = settings.quoteCache?.[key];
        const cutoff = Date.now() - 7 * DAY_MS;
        const baseline = (settings.priceHistory?.[key] ?? [])
          .filter((point) => point.fetchedAt <= cutoff)
          .sort((a, b) => b.fetchedAt - a.fetchedAt)[0];
        if (!quote || !baseline || baseline.price <= 0) return undefined;
        return ((quote.price - baseline.price) / baseline.price) * 100;
      }

      const cached = settings.weeklyCache?.[key] ?? settings.weeklyCache?.[symbol];
      if (cached && Date.now() - cached.fetchedAt < DAY_MS) return cached.weeklyPercent;
      const apiKey = settings.apiKey?.trim();
      if (!apiKey) return undefined;
      settings = await this.consumeAlphaRequest(settings);
      const payload = await this.fetchAlphaJson<AlphaVantageWeekly>("TIME_SERIES_WEEKLY", symbol, apiKey);
      const series = payload["Weekly Time Series"];
      const closes = series
        ? Object.entries(series).sort(([a], [b]) => b.localeCompare(a)).slice(0, 2).map(([, value]) => Number(value["4. close"]))
        : [];
      if (closes.length < 2 || closes.some((value) => !Number.isFinite(value))) {
        throw new ProviderError(this.alphaError(payload) ?? "No weekly history returned");
      }
      const weeklyPercent = ((closes[0] - closes[1]) / closes[1]) * 100;
      const snapshot = { weeklyPercent, fetchedAt: Date.now() };
      const latest = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      await streamDeck.settings.setGlobalSettings({
        ...latest,
        weeklyCache: { ...(latest.weeklyCache ?? {}), [key]: snapshot },
      });
      return weeklyPercent;
    });
  }

  async cachedQuote(provider: DataProvider, symbol: string): Promise<QuoteSnapshot | undefined> {
    const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    return settings.quoteCache?.[this.cacheKey(provider, symbol)]
      ?? (provider === "alphaVantage" ? settings.quoteCache?.[symbol] : undefined);
  }

  async cachedWeeklyChange(provider: DataProvider, symbol: string): Promise<number | undefined> {
    const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    return settings.weeklyCache?.[this.cacheKey(provider, symbol)]?.weeklyPercent
      ?? (provider === "alphaVantage" ? settings.weeklyCache?.[symbol]?.weeklyPercent : undefined);
  }

  private async fetchAlphaQuote(settings: GlobalSettings, symbol: string): Promise<QuoteSnapshot> {
    const apiKey = settings.apiKey?.trim();
    if (!apiKey) throw new MissingApiKeyError("Set Alpha Vantage API key");
    await this.consumeAlphaRequest(settings);
    const payload = await this.fetchAlphaJson<AlphaVantageQuote>("GLOBAL_QUOTE", symbol, apiKey);
    const quote = payload["Global Quote"];
    const price = Number(quote?.["05. price"]);
    const dailyPercent = Number(quote?.["10. change percent"]?.replace("%", ""));
    if (!quote || !Number.isFinite(price) || !Number.isFinite(dailyPercent)) {
      throw new ProviderError(this.alphaError(payload) ?? "No quote returned");
    }
    return { symbol, price, dailyPercent, fetchedAt: Date.now() };
  }

  private async fetchFinnhubQuote(settings: GlobalSettings, symbol: string): Promise<QuoteSnapshot> {
    const apiKey = settings.finnhubApiKey?.trim();
    if (!apiKey) throw new MissingApiKeyError("Set Finnhub API key");
    await this.consumeFinnhubRequest(settings);
    const url = new URL("https://finnhub.io/api/v1/quote");
    url.searchParams.set("symbol", symbol);
    const response = await fetch(url, {
      headers: { "X-Finnhub-Token": apiKey },
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status === 429) throw new RequestLimitError("Finnhub rate limit reached");
    if (!response.ok) throw new ProviderError(`Finnhub HTTP ${response.status}`);
    const payload = (await response.json()) as FinnhubQuote;
    const price = Number(payload.c);
    const dailyPercent = Number(payload.dp);
    const previousClose = Number(payload.pc);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(dailyPercent)) {
      throw new ProviderError(payload.error ?? "No Finnhub quote returned");
    }
    return {
      symbol,
      price,
      dailyPercent,
      previousClose: Number.isFinite(previousClose) && previousClose > 0 ? previousClose : undefined,
      fetchedAt: Date.now(),
    };
  }

  private async consumeAlphaRequest(settings: GlobalSettings): Promise<GlobalSettings> {
    const timestamps = (settings.requestTimestamps ?? []).filter((value) => value > Date.now() - DAY_MS);
    const configured = Number(settings.dailyRequestLimit ?? DEFAULT_ALPHA_DAILY_LIMIT);
    const limit = Math.min(25, Math.max(1, Number.isFinite(configured) ? Math.floor(configured) : DEFAULT_ALPHA_DAILY_LIMIT));
    if (timestamps.length >= limit) throw new RequestLimitError(`Alpha Vantage daily budget reached (${limit})`);
    const latest = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const updated = { ...latest, dailyRequestLimit: limit, requestTimestamps: [...timestamps, Date.now()] };
    await streamDeck.settings.setGlobalSettings(updated);
    return updated;
  }

  private async consumeFinnhubRequest(settings: GlobalSettings): Promise<GlobalSettings> {
    const timestamps = (settings.finnhubRequestTimestamps ?? []).filter((value) => value > Date.now() - MINUTE_MS);
    const configured = Number(settings.finnhubMinuteLimit ?? DEFAULT_FINNHUB_MINUTE_LIMIT);
    const limit = Math.min(60, Math.max(1, Number.isFinite(configured) ? Math.floor(configured) : DEFAULT_FINNHUB_MINUTE_LIMIT));
    if (timestamps.length >= limit) throw new RequestLimitError(`Finnhub minute budget reached (${limit})`);
    const latest = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const updated = { ...latest, finnhubMinuteLimit: limit, finnhubRequestTimestamps: [...timestamps, Date.now()] };
    await streamDeck.settings.setGlobalSettings(updated);
    return updated;
  }

  private async migrateLegacyKey(settings: GlobalSettings, legacyApiKey?: string): Promise<GlobalSettings> {
    if (settings.apiKey?.trim() || !legacyApiKey?.trim()) return settings;
    const updated = { ...settings, apiKey: legacyApiKey.trim() };
    await streamDeck.settings.setGlobalSettings(updated);
    return updated;
  }

  private async fetchAlphaJson<T>(functionName: string, symbol: string, apiKey: string): Promise<T> {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", functionName);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new ProviderError(`Alpha Vantage HTTP ${response.status}`);
    return (await response.json()) as T;
  }

  private alphaError(payload: { Information?: string; Note?: string; "Error Message"?: string }): string | undefined {
    return payload["Error Message"] ?? payload.Note ?? payload.Information;
  }

  private cacheKey(provider: DataProvider, symbol: string): string {
    return `${provider}:${symbol}`;
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
