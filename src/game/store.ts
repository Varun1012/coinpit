import { create } from "zustand";
import * as L from "./logic";

const KEY = "coinpit-v8";

type Store = {
  game: L.State | null;
  saved: boolean;
  boot: () => void;
  start: () => void;
  resume: () => void;
  abandon: () => void;
  adopt: (game: L.State) => void;
  drop: () => void;
  roll: () => void;
  step: () => void;
  dismiss: () => void;
  pick: (id: string) => void;
  ai: () => void;
};

function persist(game: L.State | null) {
  try {
    if (!game) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(game));
  } catch {
    /* private mode */
  }
}

function readSave(): L.State | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const game = JSON.parse(raw) as L.State;
    if (!game || !Array.isArray(game.players) || game.players.length !== 4) return null;
    if (!game.prices || !game.hist || !Array.isArray(game.nfts)) return null;
    return game;
  } catch {
    return null;
  }
}

export const useFloor = create<Store>((set, get) => ({
  game: null,
  saved: false,
  boot: () => set({ saved: !!readSave() }),
  start: () => {
    const game = L.createGame();
    persist(game);
    set({ game, saved: true });
  },
  resume: () => {
    const game = readSave();
    if (!game) {
      persist(null);
      set({ saved: false });
      return;
    }
    set({ game, saved: true });
  },
  abandon: () => set({ game: null }),
  adopt: (game) => set({ game }),
  drop: () => set({ game: null }),
  roll: () => {
    const g = get().game;
    if (!g) return;
    const next = L.roll(g);
    if (next === g) return;
    persist(next);
    set({ game: next });
  },
  step: () => {
    const g = get().game;
    if (!g || g.phase !== "moving") return;
    const next = L.step(g);
    persist(next);
    set({ game: next });
  },
  dismiss: () => {
    const g = get().game;
    if (!g) return;
    const next = L.dismissCard(g);
    if (next === g) return;
    persist(next);
    set({ game: next });
  },
  pick: (id: string) => {
    const g = get().game;
    if (!g) return;
    if (id.startsWith("offer:") && g.phase === "need-roll") {
      const [, to, nft, price, side] = id.split(":");
      const next = L.proposeTrade(g, Number(to), Number(nft), Number(price), side === "buy" ? "buy" : "sell");
      if (next === g) return;
      persist(next);
      set({ game: next });
      return;
    }
    if (g.phase === "trade" && (id === "trade-yes" || id === "trade-no")) {
      const next = L.resolveTrade(g, id === "trade-yes");
      if (next === g) return;
      persist(next);
      set({ game: next });
      return;
    }
    const next = L.applyOption(g, id);
    if (next === g) return;
    persist(next);
    set({ game: next });
  },
  ai: () => {
    const g = get().game;
    if (!g || g.phase === "over" || g.phase === "moving") return;
    if (g.phase === "trade" && g.trade) {
      const target = g.players[g.trade.to];
      if (!target || target.human) return;
      const next = L.resolveTrade(g, L.aiTrade(g));
      if (next === g) return;
      persist(next);
      set({ game: next });
      return;
    }
    const p = g.players[g.turn];
    if (p.human || p.bankrupt) return;
    let next = g;
    if (g.phase === "need-roll" || g.phase === "steal-roll") next = L.roll(g);
    else if (g.phase === "jail") {
      const me = g.players[g.turn];
      const mustPay = me.jailTries >= 3;
      const payEarly = me.cash >= L.JAIL_FINE && me.style !== "whale" && me.jailTries >= 1;
      next = mustPay || payEarly ? L.applyOption(g, "jail-pay") : L.roll(g);
    } else if (g.phase === "card") next = L.dismissCard(g);
    else if (g.phase === "need-choice") {
      const opts = L.currentOptions(g);
      next = L.applyOption(g, L.aiPick(g, opts));
    } else return;
    if (next === g) return;
    persist(next);
    set({ game: next });
  },
}));
