import streamDeck from "@elgato/streamdeck";
import { StockPriceAction } from "./stock-price-action";

streamDeck.logger.setLevel("info");
streamDeck.settings.useExperimentalMessageIdentifiers = true;
const stockPriceAction = new StockPriceAction();
streamDeck.actions.registerAction(stockPriceAction);
streamDeck.settings.onDidReceiveGlobalSettings(() => void stockPriceAction.refreshVisible());
streamDeck.connect();
