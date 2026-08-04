import {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import { FinnhubStream } from "./finnhub-stream";
import { DataProvider, MarketDataService, MissingApiKeyError, ProviderError, RequestLimitError } from "./market-data";

type StockSettings = {
  provider?: DataProvider;
  symbol?: string;
  refreshSeconds?: number;
  showDaily?: boolean;
  showWeekly?: boolean;
  colorMetric?: "daily" | "weekly";
  backgroundStyle?: "pure" | "icon" | "custom";
  customBackgroundColor?: string;
  upBackgroundColor?: string;
  downBackgroundColor?: string;
  neutralBackgroundColor?: string;
  textSize?: "compact" | "standard" | "large";
  apiKey?: string;
};

const DEFAULT_REFRESH_SECONDS = 14_400;
const MIN_REFRESH_SECONDS = 60;

@action({ UUID: "com.chen.stock-price.quote" })
export class StockPriceAction extends SingletonAction<StockSettings> {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly visible = new Map<string, { action: WillAppearEvent<StockSettings>["action"]; settings: StockSettings }>();
  private readonly marketData = new MarketDataService();
  private readonly finnhubStream = new FinnhubStream((symbol, price) => this.queueFinnhubPrice(symbol, price));
  private readonly streamPrices = new Map<string, number>();
  private readonly streamRenderTimers = new Map<string, ReturnType<typeof setTimeout>>();

  override async onWillAppear(ev: WillAppearEvent<StockSettings>): Promise<void> {
    this.visible.set(ev.action.id, { action: ev.action, settings: ev.payload.settings });
    this.syncFinnhubStream();
    await this.refresh(ev.action, ev.payload.settings);
    this.schedule(ev.action, ev.payload.settings);
  }

  override onWillDisappear(ev: WillDisappearEvent<StockSettings>): void {
    this.visible.delete(ev.action.id);
    this.syncFinnhubStream();
    this.clearTimer(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<StockSettings>): Promise<void> {
    this.visible.set(ev.action.id, { action: ev.action, settings: ev.payload.settings });
    this.syncFinnhubStream();
    await this.refresh(ev.action, ev.payload.settings);
    this.schedule(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<StockSettings>): Promise<void> {
    await this.refresh(ev.action, ev.payload.settings, true);
  }

  async refreshVisible(): Promise<void> {
    this.syncFinnhubStream();
    await Promise.all([...this.visible.values()].map(({ action, settings }) => this.refresh(action, settings)));
  }

  private schedule(actionInstance: WillAppearEvent<StockSettings>["action"], settings: StockSettings): void {
    this.clearTimer(actionInstance.id);
    const requested = Number(settings.refreshSeconds ?? DEFAULT_REFRESH_SECONDS);
    if (requested === 0) return;
    const minimum = settings.provider === "finnhub" ? 3_600 : MIN_REFRESH_SECONDS;
    const seconds = Math.max(minimum, Number.isFinite(requested) ? requested : DEFAULT_REFRESH_SECONDS);
    this.timers.set(actionInstance.id, setInterval(() => void this.refresh(actionInstance, settings), seconds * 1000));
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
  }

  private syncFinnhubStream(): void {
    const symbols = [...this.visible.values()]
      .filter(({ settings }) => settings.provider === "finnhub")
      .map(({ settings }) => settings.symbol?.trim().toUpperCase() || "AAPL");
    void this.finnhubStream.setSymbols(symbols);
  }

  private queueFinnhubPrice(symbol: string, price: number): void {
    this.streamPrices.set(symbol, price);
    if (this.streamRenderTimers.has(symbol)) return;
    const timer = setTimeout(() => {
      this.streamRenderTimers.delete(symbol);
      const latestPrice = this.streamPrices.get(symbol);
      if (latestPrice !== undefined) void this.renderFinnhubPrice(symbol, latestPrice);
    }, 1_000);
    this.streamRenderTimers.set(symbol, timer);
  }

  private async renderFinnhubPrice(symbol: string, price: number): Promise<void> {
    const targets = [...this.visible.values()].filter(({ settings }) =>
      settings.provider === "finnhub"
      && (settings.symbol?.trim().toUpperCase() || "AAPL") === symbol,
    );
    if (targets.length === 0) return;
    const cached = await this.marketData.cachedQuote("finnhub", symbol);
    if (!cached) return;
    const dailyPercent = cached.previousClose && cached.previousClose > 0
      ? ((price - cached.previousClose) / cached.previousClose) * 100
      : cached.dailyPercent;
    const needsWeekly = targets.some(({ settings }) => settings.showWeekly !== false);
    const weeklyPercent = needsWeekly
      ? await this.marketData.getWeeklyChange("finnhub", symbol)
      : undefined;

    await Promise.all(targets.map(async ({ action, settings }) => {
      const lines = [symbol, this.formatPrice(price)];
      if (settings.showDaily !== false) lines.push(`D ${this.formatPercent(dailyPercent)}`);
      if (settings.showWeekly !== false) {
        lines.push(weeklyPercent === undefined ? "W WAIT" : `W ${this.formatPercent(weeklyPercent)}`);
      }
      const colorValue = settings.colorMetric === "weekly" && weeklyPercent !== undefined
        ? weeklyPercent
        : dailyPercent;
      await this.render(action, lines, colorValue, settings);
    }));
  }

  private async refresh(
    actionInstance: WillAppearEvent<StockSettings>["action"],
    settings: StockSettings,
    pressed = false,
  ): Promise<void> {
    const symbol = settings.symbol?.trim().toUpperCase() || "AAPL";
    const provider = settings.provider ?? "alphaVantage";
    try {
      const quote = await this.marketData.getQuote(provider, symbol, settings.apiKey, pressed);
      let weeklyPercent: number | undefined;
      let weeklyStatus: "CAP" | "ERR" | "WAIT" | undefined = provider === "finnhub" ? "WAIT" : undefined;
      if (settings.showWeekly !== false) {
        try {
          weeklyPercent = await this.marketData.getWeeklyChange(provider, symbol, settings.apiKey);
        } catch (error) {
          weeklyPercent = await this.marketData.cachedWeeklyChange(provider, symbol);
          weeklyStatus = this.isLimitError(error) ? "CAP" : "ERR";
          console.error(`Weekly refresh failed for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      const lines = [symbol, this.formatPrice(quote.price)];
      if (settings.showDaily !== false) lines.push(`D ${this.formatPercent(quote.dailyPercent)}`);
      if (settings.showWeekly !== false) {
        lines.push(weeklyPercent === undefined ? `W ${weeklyStatus ?? "--"}` : `W ${this.formatPercent(weeklyPercent)}`);
      }
      const colorValue = settings.colorMetric === "weekly" && weeklyPercent !== undefined
        ? weeklyPercent
        : quote.dailyPercent;
      await this.render(actionInstance, lines, colorValue, settings);
    } catch (error) {
      const cached = await this.marketData.cachedQuote(provider, symbol);
      if (cached) {
        await this.render(actionInstance, [symbol, this.formatPrice(cached.price), "Cached"], cached.dailyPercent, settings);
      } else {
        const label = this.errorLabel(error);
        await this.render(actionInstance, [symbol, label], 0, settings);
      }
      if (pressed) await actionInstance.showAlert();
      console.error(`Quote refresh failed for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: price < 10 ? 3 : 2,
      maximumFractionDigits: price < 10 ? 3 : 2,
    }).format(price);
  }

  private formatPercent(value: number): string {
    const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "•";
    return `${arrow}${Math.abs(value).toFixed(2)}%`;
  }

  private errorLabel(error: unknown): string {
    if (error instanceof MissingApiKeyError) return "Set API key";
    if (this.isLimitError(error)) return "API limit";
    if (error instanceof ProviderError && /invalid api call|symbol|no .* quote/i.test(error.message)) return "Check symbol";
    return "Unavailable";
  }

  private isLimitError(error: unknown): boolean {
    return error instanceof RequestLimitError
      || (error instanceof Error && /limit|frequency|requests per day|call volume|premium/i.test(error.message));
  }

  private async render(
    actionInstance: WillAppearEvent<StockSettings>["action"],
    lines: string[],
    change: number,
    settings: StockSettings,
  ): Promise<void> {
    const { fill, decoration } = this.backgroundAppearance(settings, change);
    const preset = settings.textSize ?? "standard";
    const typography = {
      compact: { symbol: 18, price: 20, daily: 14, weekly: 13, gap: 7 },
      standard: { symbol: 20, price: 24, daily: 16, weekly: 14, gap: 7 },
      large: { symbol: 22, price: 27, daily: 17, weekly: 15, gap: 6 },
    }[preset];
    const desiredSizes = lines.map((_, index) => {
      if (index === 0) return typography.symbol;
      if (index === 1) return typography.price;
      if (index === 2) return typography.daily;
      return typography.weekly;
    });
    const sizes = lines.map((line, index) => this.fittedFontSize(line, desiredSizes[index]));
    const totalHeight = sizes.reduce((sum, size) => sum + size, 0) + typography.gap * (lines.length - 1);
    let cursorY = 72 - totalHeight / 2;
    const text = lines.map((line, index) => {
      const size = sizes[index];
      const weight = index === 1 ? 750 : index === 0 ? 700 : 600;
      const y = cursorY + size / 2;
      cursorY += size + typography.gap;
      return `<text x="72" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${size}" font-weight="${weight}">${this.escapeXml(line)}</text>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" fill="${fill}"/>${decoration}${text}</svg>`;
    const bytes = new TextEncoder().encode(svg);
    const image = `data:image/svg+xml;base64,${btoa(String.fromCharCode(...bytes))}`;
    await actionInstance.setTitle("");
    await actionInstance.setImage(image);
  }

  private fittedFontSize(text: string, desiredSize: number): number {
    const estimatedWidth = [...text].reduce((width, character) => {
      if (/[MW%@]/.test(character)) return width + 0.82;
      if (/[ilI1 .]/.test(character)) return width + 0.34;
      return width + 0.6;
    }, 0) * desiredSize;
    if (estimatedWidth <= 128) return desiredSize;
    return Math.max(11, Math.floor(desiredSize * (128 / estimatedWidth)));
  }

  private backgroundAppearance(settings: StockSettings, change: number): { fill: string; decoration: string } {
    if (settings.backgroundStyle === "icon") {
      return {
        fill: "#111827",
        decoration: `<g fill="none" stroke="#5EE6A8" stroke-linecap="round" opacity="0.22"><path d="M15 116 L43 88 L64 101 L92 66 L126 44" stroke-width="8" stroke-linejoin="round"/><path d="M31 76 V45 M50 91 V58 M76 74 V38 M104 55 V24" stroke-width="6"/><path d="M24 56 H38 M43 68 H57 M69 49 H83 M97 37 H111" stroke-width="12"/></g>`,
      };
    }

    if (settings.backgroundStyle === "custom") {
      const custom = settings.customBackgroundColor?.trim();
      return {
        fill: custom && /^#[0-9a-f]{6}$/i.test(custom) ? custom : "#374151",
        decoration: "",
      };
    }

    const up = this.validColor(settings.upBackgroundColor, "#086B4F");
    const down = this.validColor(settings.downBackgroundColor, "#991B3A");
    const neutral = this.validColor(settings.neutralBackgroundColor, "#374151");
    return {
      fill: change > 0 ? up : change < 0 ? down : neutral,
      decoration: "",
    };
  }

  private validColor(value: string | undefined, fallback: string): string {
    const color = value?.trim();
    return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }

  private escapeXml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }
}
