import streamDeck from "@elgato/streamdeck";
import type { GlobalSettings } from "./market-data";

type FinnhubTrade = { p?: number; s?: string; t?: number };
type FinnhubMessage = { type?: string; data?: FinnhubTrade[] };

export class FinnhubStream {
  private socket?: WebSocket;
  private desiredSymbols = new Set<string>();
  private subscribedSymbols = new Set<string>();
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private tokenFingerprint = "";
  private intentionallyClosed = false;

  constructor(private readonly onPrice: (symbol: string, price: number) => void) {}

  async setSymbols(symbols: Iterable<string>): Promise<void> {
    this.desiredSymbols = new Set([...symbols].map((symbol) => symbol.trim().toUpperCase()).filter(Boolean));
    if (this.desiredSymbols.size === 0) {
      this.close();
      return;
    }

    const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const token = settings.finnhubApiKey?.trim();
    if (!token) {
      this.close();
      return;
    }

    const fingerprint = this.fingerprint(token);
    if (!this.socket || this.tokenFingerprint !== fingerprint || this.socket.readyState > WebSocket.OPEN) {
      this.connect(token, fingerprint);
      return;
    }
    if (this.socket.readyState === WebSocket.OPEN) this.syncSubscriptions();
  }

  close(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.subscribedSymbols.clear();
    this.socket?.close();
    this.socket = undefined;
  }

  private connect(token: string, fingerprint: string): void {
    this.intentionallyClosed = true;
    this.socket?.close();
    this.intentionallyClosed = false;
    this.subscribedSymbols.clear();
    this.tokenFingerprint = fingerprint;

    const url = new URL("wss://ws.finnhub.io");
    url.searchParams.set("token", token);
    const socket = new WebSocket(url.toString());
    this.socket = socket;

    socket.addEventListener("open", () => this.syncSubscriptions());
    socket.addEventListener("message", (event) => this.handleMessage(event.data));
    socket.addEventListener("error", () => console.error("Finnhub WebSocket connection error"));
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      this.subscribedSymbols.clear();
      if (!this.intentionallyClosed && this.desiredSymbols.size > 0) {
        this.reconnectTimer = setTimeout(() => void this.setSymbols(this.desiredSymbols), 5_000);
      }
    });
  }

  private syncSubscriptions(): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    for (const symbol of this.subscribedSymbols) {
      if (!this.desiredSymbols.has(symbol)) {
        socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
        this.subscribedSymbols.delete(symbol);
      }
    }
    for (const symbol of this.desiredSymbols) {
      if (!this.subscribedSymbols.has(symbol)) {
        socket.send(JSON.stringify({ type: "subscribe", symbol }));
        this.subscribedSymbols.add(symbol);
      }
    }
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") return;
    try {
      const message = JSON.parse(data) as FinnhubMessage;
      if (message.type !== "trade" || !Array.isArray(message.data)) return;
      const latest = new Map<string, number>();
      for (const trade of message.data) {
        const symbol = trade.s?.toUpperCase();
        const price = Number(trade.p);
        if (symbol && Number.isFinite(price) && price > 0) latest.set(symbol, price);
      }
      for (const [symbol, price] of latest) this.onPrice(symbol, price);
    } catch {
      console.error("Finnhub WebSocket returned an unreadable message");
    }
  }

  private fingerprint(token: string): string {
    let hash = 0;
    for (let index = 0; index < token.length; index++) hash = ((hash << 5) - hash + token.charCodeAt(index)) | 0;
    return `${token.length}:${hash}`;
  }
}
