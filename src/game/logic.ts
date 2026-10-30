export const COINS = ["BTC", "ETH", "XRP"] as const;
export type Coin = (typeof COINS)[number];

export const WIN = 100_000;
export const START_CASH = 150;
export const STIPEND = 20;
export const MINE_COST = 36;
export const FEE = 0.025;
export const BOARD = 20;
export const STEAL_AT = 15;
export const MAX_NFT_LEVEL = 6;

/** 升到下一級的價錢。一級升二級 150，之後每級再加 150。 */
export function upgradeCost(level: number): number {
  return 150 * level;
}

const INITIAL: Record<Coin, number> = { BTC: 28, ETH: 4.6, XRP: 0.28 };

export type Style = "human" | "cautious" | "mm" | "whale";

export type Player = {
  id: string;
  name: string;
  human: boolean;
  style: Style;
  cash: number;
  bags: Record<Coin, number>;
  miner: boolean;
  pos: number;
  bankrupt: boolean;
};

export type Nft = {
  key: string;
  name: string;
  cost: number;
  upgrade: number;
  level: number;
  owner: number | null;
};

export type TileKind =
  | "start"
  | "spot"
  | "nft"
  | "fund"
  | "air"
  | "mine"
  | "mkt"
  | "steal"
  | "p2p";

export type TileDef = {
  kind: TileKind;
  label: string;
  coin?: Coin;
  nft?: number;
};

export const TILES: TileDef[] = [
  { kind: "start", label: "起點" },
  { kind: "spot", label: "ETH", coin: "ETH" },
  { kind: "fund", label: "基本面" },
  { kind: "nft", label: "冷庫", nft: 0 },
  { kind: "spot", label: "BTC", coin: "BTC" },
  { kind: "air", label: "空投" },
  { kind: "mkt", label: "市場" },
  { kind: "spot", label: "XRP", coin: "XRP" },
  { kind: "nft", label: "港口", nft: 3 },
  { kind: "spot", label: "ETH", coin: "ETH" },
  { kind: "p2p", label: "內盤" },
  { kind: "mkt", label: "市場" },
  { kind: "spot", label: "BTC", coin: "BTC" },
  { kind: "fund", label: "基本面" },
  { kind: "nft", label: "天台", nft: 2 },
  { kind: "steal", label: "盜錢包" },
  { kind: "nft", label: "機房", nft: 1 },
  { kind: "mkt", label: "市場" },
  { kind: "mine", label: "挖礦" },
  { kind: "spot", label: "XRP", coin: "XRP" },
];

/** Clockwise from the bottom-right start. Column, row are 1-indexed on a 6×6 pit. */
export const COORDS: ReadonlyArray<readonly [number, number]> = [
  [6, 6],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [1, 5],
  [1, 4],
  [1, 3],
  [1, 2],
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
];

export type Candle = { t: number; c: number };
export type Phase = "need-roll" | "moving" | "need-choice" | "card" | "over";
export type Card = { title: string; body: string; mode: "info" | "pre-steal" };
export type Opt = {
  id: string;
  label: string;
  detail: string;
  tone: "primary" | "ghost" | "danger";
  disabled?: boolean;
};

export type WinReason = "net" | "wipe" | null;

export type State = {
  players: Player[];
  turn: number;
  round: number;
  phase: Phase;
  dice: number;
  sixChain: number;
  chainRoll: boolean;
  stepsLeft: number;
  bases: Record<Coin, number>;
  deltas: Record<Coin, number>;
  prices: Record<Coin, number>;
  hist: Record<Coin, Candle[]>;
  fear: number;
  liquidity: number;
  nfts: Nft[];
  feePot: number;
  log: string[];
  card: Card | null;
  choiceHint: string;
  winner: number | null;
  winReason: WinReason;
  tick: number;
};

const SPOT_QTY: Record<Coin, number[]> = {
  BTC: [0.5, 1, 2],
  ETH: [3, 8, 16],
  XRP: [30, 80, 200],
};

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  return (
    sign +
    v.toLocaleString("en-US", {
      maximumFractionDigits: v >= 100 ? 0 : 2,
    })
  );
}

export function px(n: number): string {
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

export function qty(n: number): string {
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(3);
}

export function fearLabel(n: number): string {
  if (n < 25) return "極貪";
  if (n < 40) return "貪婪";
  if (n < 55) return "中性";
  if (n < 75) return "恐懼";
  return "極端恐懼";
}

export function liqLabel(n: number): string {
  if (n < 35) return "枯";
  if (n < 48) return "低";
  if (n < 65) return "中";
  return "高";
}

export function liqTn(n: number): string {
  return (0.55 + (n / 100) * 1.7).toFixed(2);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pushLog(s: State, line: string) {
  s.log = [line, ...s.log].slice(0, 40);
}

export function quote(base: number, delta: number): number {
  return r2(Math.max(base * 0.15, base + delta));
}

function sync(s: State) {
  for (const c of COINS) {
    s.deltas[c] = r2(clamp(s.deltas[c], -s.bases[c] * 0.8, s.bases[c] * 1.6));
    s.prices[c] = quote(s.bases[c], s.deltas[c]);
  }
}

export function nftBook(n: Nft): number {
  let v = n.cost;
  for (let level = 1; level < n.level; level++) v += upgradeCost(level);
  return v;
}

export function netWorth(s: State, i: number): number {
  const p = s.players[i];
  if (p.bankrupt) return 0;
  let n = p.cash;
  for (const c of COINS) n += p.bags[c] * s.prices[c];
  for (const nft of s.nfts) if (nft.owner === i) n += nftBook(nft);
  if (p.miner) n += MINE_COST;
  return r2(n);
}

function walk(base: number): { hist: Candle[]; delta: number; price: number } {
  const hist: Candle[] = [];
  let delta = 0;
  for (let i = 0; i < 16; i++) {
    const shock = clamp(gauss() * base * 0.014, -base * 0.045, base * 0.045);
    delta = delta * 0.88 + shock;
    hist.push({ t: i, c: quote(base, delta) });
  }
  const price = hist[hist.length - 1].c;
  return { hist, delta: r2(price - base), price };
}

export function createGame(): State {
  const bases = { ...INITIAL };
  const deltas = { BTC: 0, ETH: 0, XRP: 0 };
  const prices = { BTC: 0, ETH: 0, XRP: 0 };
  const hist = { BTC: [] as Candle[], ETH: [] as Candle[], XRP: [] as Candle[] };
  for (const c of COINS) {
    const w = walk(bases[c]);
    hist[c] = w.hist;
    deltas[c] = w.delta;
    prices[c] = w.price;
  }
  const players: Player[] = [
    {
      id: "you",
      name: "你",
      human: true,
      style: "human",
      cash: START_CASH,
      bags: { BTC: 0, ETH: 0, XRP: 0 },
      miner: false,
      pos: 0,
      bankrupt: false,
    },
    {
      id: "north",
      name: "北區",
      human: false,
      style: "cautious",
      cash: START_CASH,
      bags: { BTC: 0, ETH: 0, XRP: 0 },
      miner: false,
      pos: 0,
      bankrupt: false,
    },
    {
      id: "mm",
      name: "做市",
      human: false,
      style: "mm",
      cash: START_CASH,
      bags: { BTC: 0, ETH: 0, XRP: 0 },
      miner: false,
      pos: 0,
      bankrupt: false,
    },
    {
      id: "whale",
      name: "巨鯨",
      human: false,
      style: "whale",
      cash: START_CASH,
      bags: { BTC: 0, ETH: 0, XRP: 0 },
      miner: false,
      pos: 0,
      bankrupt: false,
    },
  ];
  return {
    players,
    turn: 0,
    round: 1,
    phase: "need-roll",
    dice: 0,
    sixChain: 0,
    chainRoll: false,
    stepsLeft: 0,
    bases,
    deltas,
    prices,
    hist,
    fear: 50,
    liquidity: 50,
    nfts: [
      { key: "cold", name: "冷庫", cost: 48, upgrade: 150, level: 1, owner: null },
      { key: "rig", name: "機房", cost: 72, upgrade: 150, level: 1, owner: null },
      { key: "roof", name: "天台", cost: 96, upgrade: 150, level: 1, owner: null },
      { key: "port", name: "港口", cost: 58, upgrade: 150, level: 1, owner: null },
    ],
    feePot: 0,
    log: [
      "盤口開啟。四人各持 150 USDT。恐貪 50、流動性居中。淨值先到 100,000，或讓其餘三人破產。",
      "順時針走。經過起點免費 20。冷庫、機房、天台、港口要等別人踩到才收租，一級擲一顆骰、1–6 USDT。",
    ],
    card: null,
    choiceHint: "",
    winner: null,
    winReason: null,
    tick: 15,
  };
}

function actor(s: State): Player {
  return s.players[s.turn];
}

export function roll(state: State): State {
  if (state.phase !== "need-roll") return state;
  if (state.players[state.turn].bankrupt) return state;
  const s = structuredClone(state) as State;
  const n = 1 + Math.floor(Math.random() * 6);
  s.dice = n;
  const me = actor(s);
  pushLog(s, `${me.name} 擲出 ${n}`);
  if (n === 6) {
    s.sixChain += 1;
    if (s.sixChain >= 3) {
      s.sixChain = 0;
      s.chainRoll = false;
      s.fear = r2(clamp(s.fear + 10, 0, 100));
      s.card = {
        title: "三連六",
        body: "連續三個 6。不走路，直接被丟到右上角「盜錢包」。恐貪指數上升。",
        mode: "pre-steal",
      };
      s.phase = "card";
      pushLog(s, `${me.name} 三連六，送往盜錢包`);
      return s;
    }
    s.chainRoll = true;
    pushLog(s, `${me.name} 擲出 6，這格結算後可以再擲`);
  } else {
    s.sixChain = 0;
    s.chainRoll = false;
  }
  s.stepsLeft = n;
  s.phase = "moving";
  return s;
}

export function step(state: State): State {
  if (state.phase !== "moving" || state.stepsLeft <= 0) return state;
  const s = structuredClone(state) as State;
  const me = actor(s);
  me.pos = (me.pos + 1) % BOARD;
  s.stepsLeft -= 1;
  if (me.pos === 0) {
    me.cash = r2(me.cash + STIPEND);
    pushLog(s, `${me.name} 經過起點，補貼 ${money(STIPEND)} USDT`);
  }
  if (s.stepsLeft === 0) return land(s);
  return s;
}

function chargeRent(s: State, nft: Nft): State {
  const me = actor(s);
  const owner = s.players[nft.owner!];
  const faces: number[] = [];
  for (let i = 0; i < nft.level; i++) faces.push(1 + Math.floor(Math.random() * 6));
  const sum = faces.reduce((a, b) => a + b, 0);
  const pay = r2(Math.min(me.cash, sum));
  me.cash = r2(me.cash - pay);
  if (!owner.bankrupt) owner.cash = r2(owner.cash + pay);
  const shown = faces.join(" + ");
  s.card = {
    title: `${nft.name} · 骰 ${shown}`,
    body: `${nft.level} 級過路費。${me.name} 踩到 ${owner.name} 的房子，擲出 ${shown} = ${sum} USDT，實付 ${money(pay)}。自己踩到不收租。`,
    mode: "info",
  };
  pushLog(s, `${me.name} 踩中 ${owner.name} 的${nft.name}，骰 ${shown}，付 ${money(pay)}`);
  s.phase = "card";
  return s;
}

function land(s: State): State {
  const me = actor(s);
  const tile = TILES[me.pos];
  if (tile.kind === "start") {
    s.card = {
      title: "起點 · 交易所",
      body: `補貼已在經過時入帳 ${money(STIPEND)} USDT。這一格沒有第二筆。`,
      mode: "info",
    };
    s.phase = "card";
    return s;
  }
  if (tile.kind === "fund") {
    applyFund(s);
    s.phase = "card";
    return s;
  }
  if (tile.kind === "mkt") {
    applyMarketCard(s);
    s.phase = "card";
    return s;
  }
  if (tile.kind === "air") {
    applyAirdrop(s);
    s.phase = "card";
    return s;
  }
  if (tile.kind === "steal") {
    return openSteal(s);
  }
  if (tile.kind === "mine") {
    if (me.miner) {
      s.card = {
        title: "挖礦機",
        body: "你已經有一台。它會在你自己的收線時結算產出，不佔用這一步的交易。",
        mode: "info",
      };
      s.phase = "card";
      return s;
    }
    s.choiceHint = `買一台挖礦機要 ${money(MINE_COST)} USDT。之後每個你的回合收線時產出。`;
    s.phase = "need-choice";
    return s;
  }
  if (tile.kind === "nft" && tile.nft !== undefined) {
    const nft = s.nfts[tile.nft];
    if (nft.owner === null) {
      s.choiceHint = `${nft.name} 沒人持有。買下之後，其他玩家踩到才收租：一級擲一顆骰，1–6 USDT，每升一級多一顆。`;
      s.phase = "need-choice";
      return s;
    }
    if (nft.owner === s.turn) {
      if (nft.level >= MAX_NFT_LEVEL) {
        s.card = {
          title: nft.name,
          body: `已是 ${MAX_NFT_LEVEL} 級。別人踩到會擲 ${MAX_NFT_LEVEL} 顆骰。自己踩到不收租。`,
          mode: "info",
        };
        s.phase = "card";
        return s;
      }
      const cost = upgradeCost(nft.level);
      s.choiceHint = `這是你的${nft.name}，${nft.level} 級。升到 ${nft.level + 1} 級要 ${money(cost)} USDT，過路費改為擲 ${nft.level + 1} 顆骰。`;
      s.phase = "need-choice";
      return s;
    }
    return chargeRent(s, nft);
  }
  if (tile.kind === "spot" && tile.coin) {
    const c = tile.coin;
    s.choiceHint = `${c} 現貨 ${px(s.prices[c])}。買賣抽 ${FEE * 100}%，會推進下一根 K 線。可以略過。`;
    s.phase = "need-choice";
    return s;
  }
  if (tile.kind === "p2p") {
    s.choiceHint = "玩家內部成交，價格用現價。發起人付 2.5%。也可以把 NFT 房賣給現金最多的對手。";
    s.phase = "need-choice";
    return s;
  }
  s.phase = "need-choice";
  s.choiceHint = "這格沒有動作。";
  return s;
}

function openSteal(s: State): State {
  const me = actor(s);
  const any = s.players.some(
    (p, i) => i !== s.turn && !p.bankrupt && p.cash >= 1,
  );
  if (!any) {
    s.card = {
      title: "盜錢包",
      body: `${me.name} 站上右上角，但其他人的現金都不足 1 USDT。`,
      mode: "info",
    };
    s.phase = "card";
    return s;
  }
  s.choiceHint = "右上角盜錢包：指定一名對手，拿走其現金的 50%。幣與 NFT 不動。";
  s.phase = "need-choice";
  return s;
}

function applyFund(s: State) {
  const rolln = Math.floor(Math.random() * 8);
  const me = actor(s);
  if (rolln === 0) {
    bumpBase(s, "BTC", 0.08);
    s.card = {
      title: "基本面 · 減半敘事",
      body: "BTC 基本面 +8%。報價即時變，K 線要等這個回合收盤才畫上去。",
      mode: "info",
    };
  } else if (rolln === 1) {
    bumpBase(s, "ETH", 0.07);
    s.card = {
      title: "基本面 · ETF 申購",
      body: "ETH 基本面 +7%。",
      mode: "info",
    };
  } else if (rolln === 2) {
    bumpBase(s, "XRP", 0.12);
    s.card = {
      title: "基本面 · 支付牌照",
      body: "XRP 基本面 +12%。",
      mode: "info",
    };
  } else if (rolln === 3) {
    for (const c of COINS) bumpBase(s, c, -0.06);
    s.card = {
      title: "基本面 · 監管函",
      body: "三種基本面都 −6%。",
      mode: "info",
    };
  } else if (rolln === 4) {
    bumpBase(s, "ETH", 0.05);
    bumpBase(s, "XRP", 0.04);
    s.card = {
      title: "基本面 · 開發者回潮",
      body: "ETH 基本面 +5%，XRP +4%。",
      mode: "info",
    };
  } else if (rolln === 5) {
    bumpBase(s, "BTC", -0.07);
    s.card = {
      title: "基本面 · 礦工離場",
      body: "BTC 基本面 −7%。",
      mode: "info",
    };
  } else if (rolln === 6) {
    s.liquidity = r2(clamp(s.liquidity + 12, 0, 100));
    s.fear = r2(clamp(s.fear - 8, 0, 100));
    s.card = {
      title: "基本面 · 穩定幣鑄造",
      body: "流動性 +12，恐貪下降。幣價基本面這張不動。",
      mode: "info",
    };
  } else {
    const c = COINS[Math.floor(Math.random() * 3)];
    bumpBase(s, c, 0.06);
    s.card = {
      title: "基本面 · 上幣公告",
      body: `${c} 基本面 +6%。`,
      mode: "info",
    };
  }
  sync(s);
  pushLog(s, `${me.name} 抽到「${s.card?.title ?? "基本面"}」`);
}

function applyMarketCard(s: State) {
  const rolln = Math.floor(Math.random() * 8);
  const me = actor(s);
  const coin = COINS[Math.floor(Math.random() * 3)];
  if (rolln === 0) {
    s.fear = r2(clamp(s.fear + 16, 0, 100));
    for (const c of COINS) bumpDelta(s, c, -0.05);
    s.card = {
      title: "市場 · 恐懼蔓延",
      body: "恐貪 +16。三種市場價 PΔ 各 −5% 基本面。",
      mode: "info",
    };
  } else if (rolln === 1) {
    bumpDelta(s, coin, 0.1);
    s.card = {
      title: "市場 · 軋空",
      body: `${coin} 市場價 +10% 基本面。`,
      mode: "info",
    };
  } else if (rolln === 2) {
    bumpDelta(s, coin, -0.12);
    s.card = {
      title: "市場 · 閃崩",
      body: `${coin} 市場價 −12% 基本面。`,
      mode: "info",
    };
  } else if (rolln === 3) {
    s.fear = r2(clamp(s.fear - 14, 0, 100));
    for (const c of COINS) bumpDelta(s, c, 0.04);
    s.card = {
      title: "市場 · 貪婪回歸",
      body: "恐貪下降。三種市場價各 +4% 基本面。",
      mode: "info",
    };
  } else if (rolln === 4) {
    s.liquidity = r2(clamp(s.liquidity - 16, 0, 100));
    s.card = {
      title: "市場 · 流動性枯竭",
      body: "成交量掉一檔。流動性下降，下一根線會比較薄。",
      mode: "info",
    };
  } else if (rolln === 5) {
    s.liquidity = r2(clamp(s.liquidity + 12, 0, 100));
    bumpDelta(s, coin, 0.07);
    s.card = {
      title: "市場 · 巨鯨入金",
      body: `流動性上升，${coin} 市場價 +7% 基本面。`,
      mode: "info",
    };
  } else if (rolln === 6) {
    bumpDelta(s, coin, -0.08);
    s.fear = r2(clamp(s.fear + 6, 0, 100));
    s.card = {
      title: "市場 · 假突破",
      body: `${coin} 市場價 −8% 基本面，恐貪微升。`,
      mode: "info",
    };
  } else {
    for (const c of COINS) bumpDelta(s, c, 0.035);
    s.card = {
      title: "市場 · 外部買盤",
      body: "場外資金推進。三種市場價各 +3.5% 基本面。",
      mode: "info",
    };
  }
  sync(s);
  pushLog(s, `${me.name} 抽到「${s.card?.title ?? "市場"}」`);
}

function bumpBase(s: State, c: Coin, pct: number) {
  s.bases[c] = r2(Math.max(INITIAL[c] * 0.35, s.bases[c] * (1 + pct)));
}

function bumpDelta(s: State, c: Coin, pctOfBase: number) {
  s.deltas[c] = r2(s.deltas[c] + s.bases[c] * pctOfBase);
}

function applyAirdrop(s: State) {
  const me = actor(s);
  const c = COINS[Math.floor(Math.random() * 3)];
  const value = r2(6 + Math.random() * 16);
  const q = r4(value / s.prices[c]);
  me.bags[c] = r4(me.bags[c] + q);
  s.card = {
    title: "空投",
    body: `${me.name} 收到 ${qty(q)} ${c}，約值 ${money(value)} USDT。直接進持倉，不經錢包現金。`,
    mode: "info",
  };
  pushLog(s, `${me.name} 空投 ${qty(q)} ${c}`);
}

function nudge(s: State, c: Coin, notional: number, sign: number) {
  const impact = sign * s.bases[c] * (notional / 800) * 0.35;
  s.deltas[c] = r2(s.deltas[c] + impact);
  sync(s);
}

export function currentOptions(s: State): Opt[] {
  if (s.phase !== "need-choice") return [];
  const me = actor(s);
  const tile = TILES[me.pos];
  if (tile.kind === "steal") return stealOptions(s);
  if (tile.kind === "mine") return mineOptions(s);
  if (tile.kind === "nft" && tile.nft !== undefined) return nftOptions(s, tile.nft);
  if (tile.kind === "spot" && tile.coin) return spotOptions(s, tile.coin);
  if (tile.kind === "p2p") return p2pOptions(s);
  return [{ id: "skip", label: "繼續", detail: "去收線", tone: "primary" }];
}

function stealOptions(s: State): Opt[] {
  return s.players
    .map((p, i) => ({ p, i }))
    .filter(({ i, p }) => i !== s.turn && !p.bankrupt)
    .sort((a, b) => b.p.cash - a.p.cash)
    .map(({ p, i }) => {
      const take = r2(p.cash * 0.5);
      const disabled = take < 0.5;
      return {
        id: `steal:${i}`,
        label: `盜 ${p.name}`,
        detail: disabled ? "現金不足" : `拿走 ${money(take)} USDT`,
        tone: "danger" as const,
        disabled,
      };
    });
}

function mineOptions(s: State): Opt[] {
  const me = actor(s);
  const afford = me.cash >= MINE_COST;
  return [
    {
      id: "mine",
      label: "買挖礦機",
      detail: afford
        ? `${money(MINE_COST)} USDT`
        : `還差 ${money(MINE_COST - me.cash)}`,
      tone: "primary",
      disabled: !afford,
    },
    { id: "skip", label: "不買", detail: "直接收線", tone: "ghost" },
  ];
}

function nftOptions(s: State, index: number): Opt[] {
  const me = actor(s);
  const nft = s.nfts[index];
  if (nft.owner === null) {
    const afford = me.cash >= nft.cost;
    return [
      {
        id: "nft-buy",
        label: `買下${nft.name}`,
        detail: afford ? `${money(nft.cost)} USDT` : "現金不夠",
        tone: "primary",
        disabled: !afford,
      },
      { id: "skip", label: "不買", detail: "讓它空著", tone: "ghost" },
    ];
  }
  const cost = upgradeCost(nft.level);
  const afford = me.cash >= cost && nft.level < MAX_NFT_LEVEL;
  return [
    {
      id: "nft-up",
      label: `升到 ${nft.level + 1} 級`,
      detail: nft.level >= MAX_NFT_LEVEL ? "已滿級" : afford ? `${money(cost)} USDT` : "現金不夠",
      tone: "primary",
      disabled: !afford,
    },
    { id: "skip", label: "不升級", detail: "維持現有骰數", tone: "ghost" },
  ];
}

function spotOptions(s: State, c: Coin): Opt[] {
  const me = actor(s);
  const price = s.prices[c];
  const opts: Opt[] = [];
  for (const q of SPOT_QTY[c]) {
    const notional = q * price;
    const cost = notional * (1 + FEE);
    opts.push({
      id: `buy:${c}:${q}`,
      label: `買 ${qty(q)}`,
      detail:
        me.cash >= cost
          ? `${money(cost)} 含費`
          : "現金不夠",
      tone: "primary",
      disabled: me.cash < cost,
    });
  }
  for (const frac of [0.25, 0.5, 1]) {
    const q = me.bags[c] * frac;
    const notional = q * price;
    const label = frac === 1 ? "全賣" : `賣 ${Math.round(frac * 100)}%`;
    opts.push({
      id: `sell:${c}:${frac}`,
      label,
      detail: notional >= 1 ? `約 ${money(notional * (1 - FEE))} 入袋` : "持倉太少",
      tone: "ghost",
      disabled: notional < 1,
    });
  }
  opts.push({ id: "skip", label: "不交易", detail: "去收線", tone: "ghost" });
  return opts;
}

function p2pOptions(s: State): Opt[] {
  const me = actor(s);
  const opts: Opt[] = [];
  const buyer = richestOther(s);
  for (const c of COINS) {
    const q = me.bags[c] * 0.25;
    const notional = q * s.prices[c];
    const ok = !!buyer && buyer.cash >= notional && notional >= 1;
    opts.push({
      id: `p2p-sell:${c}`,
      label: `賣出 ${c}`,
      detail: ok
        ? `25% 給 ${buyer!.name}`
        : "對手現金或持倉不夠",
      tone: "ghost",
      disabled: !ok,
    });
  }
  for (let i = 0; i < s.players.length; i++) {
    if (i === s.turn || s.players[i].bankrupt) continue;
    for (const c of COINS) {
      const q = s.players[i].bags[c] * 0.2;
      const notional = q * s.prices[c];
      const fee = notional * FEE;
      if (notional < 1) continue;
      const ok = me.cash >= notional + fee;
      opts.push({
        id: `p2p-buy:${i}:${c}`,
        label: `向${s.players[i].name}買 ${c}`,
        detail: ok ? `${qty(q)} · ${money(notional + fee)}` : "現金不夠",
        tone: "primary",
        disabled: !ok,
      });
    }
  }
  for (let n = 0; n < s.nfts.length; n++) {
    const nft = s.nfts[n];
    if (nft.owner !== s.turn) continue;
    const price = r2(nftBook(nft) * 1.12);
    const rich = richestOther(s);
    const ok = !!rich && rich.cash >= price;
    opts.push({
      id: `p2p-nft:${n}`,
      label: `賣出${nft.name}`,
      detail: ok ? `${money(price)} 給 ${rich!.name}` : "沒有人買得起",
      tone: "danger",
      disabled: !ok,
    });
  }
  opts.push({ id: "skip", label: "不成交", detail: "去收線", tone: "ghost" });
  return opts;
}

function richestOther(s: State): Player | null {
  let best: Player | null = null;
  for (let i = 0; i < s.players.length; i++) {
    if (i === s.turn || s.players[i].bankrupt) continue;
    if (!best || s.players[i].cash > best.cash) best = s.players[i];
  }
  return best;
}

export function applyOption(state: State, id: string): State {
  if (state.phase !== "need-choice") return state;
  const opts = currentOptions(state);
  const opt = opts.find((o) => o.id === id);
  if (!opt || opt.disabled) return state;
  const s = structuredClone(state) as State;
  const me = actor(s);
  if (id === "skip") {
    pushLog(s, `${me.name} 略過這一格`);
    return settle(s);
  }
  const parts = id.split(":");
  const op = parts[0];
  if (op === "buy" || op === "sell") {
    const c = parts[1] as Coin;
    const n = Number(parts[2]);
    if (!spotTrade(s, c, op, n)) return state;
    return settle(s);
  }
  if (op === "nft-buy") {
    const tile = TILES[me.pos];
    const nft = s.nfts[tile.nft!];
    if (nft.owner !== null || me.cash < nft.cost) return state;
    me.cash = r2(me.cash - nft.cost);
    nft.owner = s.turn;
    nft.level = 1;
    pushLog(s, `${me.name} 買下 ${nft.name}（${money(nft.cost)}）`);
    return settle(s);
  }
  if (op === "nft-up") {
    const tile = TILES[me.pos];
    const nft = s.nfts[tile.nft!];
    const cost = upgradeCost(nft.level);
    if (nft.owner !== s.turn || nft.level >= MAX_NFT_LEVEL || me.cash < cost) return state;
    me.cash = r2(me.cash - cost);
    nft.level += 1;
    pushLog(s, `${me.name} 花 ${money(cost)} 把${nft.name}升到 ${nft.level} 級`);
    return settle(s);
  }
  if (op === "steal") {
    const idx = Number(parts[1]);
    const victim = s.players[idx];
    if (!victim || idx === s.turn || victim.bankrupt) return state;
    const take = r2(victim.cash * 0.5);
    if (take < 0.5) return state;
    victim.cash = r2(victim.cash - take);
    me.cash = r2(me.cash + take);
    pushLog(s, `${me.name} 盜走 ${victim.name} 現金 ${money(take)}（50%）`);
    return settle(s);
  }
  if (op === "mine") {
    if (me.miner || me.cash < MINE_COST) return state;
    me.cash = r2(me.cash - MINE_COST);
    me.miner = true;
    pushLog(s, `${me.name} 買下挖礦機`);
    return settle(s);
  }
  if (op === "p2p-sell") {
    if (!p2pSell(s, parts[1] as Coin)) return state;
    return settle(s);
  }
  if (op === "p2p-buy") {
    if (!p2pBuy(s, Number(parts[1]), parts[2] as Coin)) return state;
    return settle(s);
  }
  if (op === "p2p-nft") {
    if (!p2pNft(s, Number(parts[1]))) return state;
    return settle(s);
  }
  return state;
}

function spotTrade(s: State, c: Coin, side: "buy" | "sell", n: number): boolean {
  const me = actor(s);
  const price = s.prices[c];
  if (side === "buy") {
    const notional = n * price;
    const cost = notional * (1 + FEE);
    if (me.cash < cost || n <= 0) return false;
    me.cash = r2(me.cash - cost);
    me.bags[c] = r4(me.bags[c] + n);
    s.feePot = r2(s.feePot + notional * FEE);
    nudge(s, c, notional, 1);
    pushLog(s, `${me.name} 買入 ${qty(n)} ${c} @ ${px(price)}`);
    return true;
  }
  const q = r4(me.bags[c] * n);
  const notional = q * price;
  if (notional < 1) return false;
  const fee = notional * FEE;
  me.bags[c] = r4(me.bags[c] - q);
  me.cash = r2(me.cash + notional - fee);
  s.feePot = r2(s.feePot + fee);
  nudge(s, c, notional, -1);
  pushLog(s, `${me.name} 賣出 ${qty(q)} ${c} @ ${px(price)}`);
  return true;
}

function p2pSell(s: State, c: Coin): boolean {
  const me = actor(s);
  const buyer = richestOther(s);
  if (!buyer) return false;
  const q = r4(me.bags[c] * 0.25);
  const notional = q * s.prices[c];
  if (notional < 1 || buyer.cash < notional) return false;
  const fee = notional * FEE;
  me.bags[c] = r4(me.bags[c] - q);
  buyer.bags[c] = r4(buyer.bags[c] + q);
  buyer.cash = r2(buyer.cash - notional);
  me.cash = r2(me.cash + notional - fee);
  s.feePot = r2(s.feePot + fee);
  nudge(s, c, notional * 0.4, -1);
  pushLog(s, `${me.name} 內盤賣 ${qty(q)} ${c} 給 ${buyer.name}`);
  return true;
}

function p2pBuy(s: State, idx: number, c: Coin): boolean {
  const me = actor(s);
  const other = s.players[idx];
  if (!other || other.bankrupt || idx === s.turn) return false;
  const q = r4(other.bags[c] * 0.2);
  const notional = q * s.prices[c];
  const fee = notional * FEE;
  if (notional < 1 || me.cash < notional + fee) return false;
  other.bags[c] = r4(other.bags[c] - q);
  me.bags[c] = r4(me.bags[c] + q);
  me.cash = r2(me.cash - notional - fee);
  other.cash = r2(other.cash + notional);
  s.feePot = r2(s.feePot + fee);
  nudge(s, c, notional * 0.4, 1);
  pushLog(s, `${me.name} 內盤向 ${other.name} 買入 ${qty(q)} ${c}`);
  return true;
}

function p2pNft(s: State, index: number): boolean {
  const me = actor(s);
  const nft = s.nfts[index];
  if (!nft || nft.owner !== s.turn) return false;
  const price = r2(nftBook(nft) * 1.12);
  let richI = -1;
  let richCash = -1;
  for (let i = 0; i < s.players.length; i++) {
    if (i === s.turn || s.players[i].bankrupt) continue;
    if (s.players[i].cash > richCash) {
      richCash = s.players[i].cash;
      richI = i;
    }
  }
  if (richI < 0 || s.players[richI].cash < price) return false;
  s.players[richI].cash = r2(s.players[richI].cash - price);
  me.cash = r2(me.cash + price);
  nft.owner = richI;
  pushLog(s, `${me.name} 把${nft.name}賣給 ${s.players[richI].name}`);
  return true;
}

export function dismissCard(state: State): State {
  if (state.phase !== "card" || !state.card) return state;
  const mode = state.card.mode;
  const s = structuredClone(state) as State;
  s.card = null;
  if (mode === "pre-steal") {
    actor(s).pos = STEAL_AT;
    return openSteal(s);
  }
  return settle(s);
}

function sma(s: State, c: Coin): number {
  const sl = s.hist[c].slice(-8);
  if (!sl.length) return s.prices[c];
  return sl.reduce((a, x) => a + x.c, 0) / sl.length;
}

export function aiPick(s: State, opts: Opt[]): string {
  const live = opts.filter((o) => !o.disabled);
  const skip = live.find((o) => o.id === "skip");
  const me = actor(s);
  const tile = TILES[me.pos];
  const steal = live.find((o) => o.id.startsWith("steal:"));
  if (steal) return steal.id;

  if (tile.kind === "nft") {
    const buy = live.find((o) => o.id === "nft-buy");
    const up = live.find((o) => o.id === "nft-up");
    const nft = s.nfts[tile.nft!];
    const mult = me.style === "whale" ? 1.45 : me.style === "mm" ? 1.85 : 2.35;
    if (buy && me.cash >= nft.cost * mult && s.fear < (me.style === "whale" ? 82 : 68)) {
      return buy.id;
    }
    const cost = upgradeCost(nft.level);
    const cushion = me.style === "whale" ? 30 : me.style === "mm" ? 70 : 110;
    if (up && nft.level < MAX_NFT_LEVEL && me.cash >= cost + cushion && s.fear < 74) {
      return up.id;
    }
    return skip?.id ?? live[0].id;
  }

  if (tile.kind === "mine") {
    const buy = live.find((o) => o.id === "mine");
    const floor = me.style === "whale" ? 70 : me.style === "mm" ? 95 : 120;
    if (buy && me.cash >= floor && s.fear < 70) return buy.id;
    return skip?.id ?? live[0].id;
  }

  if (tile.kind === "spot" && tile.coin) {
    const c = tile.coin;
    const price = s.prices[c];
    const avg = sma(s, c);
    const target = c === "BTC" ? 1 : c === "ETH" ? 8 : 80;
    if (me.style === "mm") {
      if (me.bags[c] > target * 1.25) {
        const sell = live.find((o) => o.id === `sell:${c}:0.25`);
        if (sell) return sell.id;
      }
      if (me.bags[c] < target * 0.75 && price < avg * 1.04) {
        const buy = [...live].reverse().find((o) => o.id.startsWith(`buy:${c}:`));
        if (buy && me.cash > START_CASH * 0.35) return buy.id;
      }
      return skip?.id ?? live[0].id;
    }
    if (me.style === "whale") {
      if (price < avg * 1.03 && s.fear < 78) {
        const buy = [...live].reverse().find((o) => o.id.startsWith(`buy:${c}:`));
        if (buy) return buy.id;
      }
      if ((price > avg * 1.18 || s.fear > 72) && me.bags[c] > 0) {
        const sell = live.find((o) => o.id === `sell:${c}:0.25` || o.id === `sell:${c}:0.5`);
        if (sell) return sell.id;
      }
      return skip?.id ?? live[0].id;
    }
    if (s.fear > 68 && me.bags[c] > 0) {
      const sell = live.find((o) => o.id === `sell:${c}:0.5`) ?? live.find((o) => o.id.startsWith("sell:"));
      if (sell) return sell.id;
    }
    if (price < avg * 0.97 && s.fear < 58) {
      const buy = live.find((o) => o.id.startsWith(`buy:${c}:`));
      if (buy) return buy.id;
    }
    return skip?.id ?? live[0].id;
  }

  if (tile.kind === "p2p") {
    if (s.fear > 64) {
      const sell = live.find((o) => o.id.startsWith("p2p-sell") && !o.disabled);
      if (sell && me.style !== "whale") return sell.id;
    }
    if (me.style === "whale" && s.fear < 60) {
      const buy = live.find((o) => o.id.startsWith("p2p-buy"));
      if (buy) return buy.id;
    }
    if (me.cash < 40 && s.fear > 70) {
      const house = live.find((o) => o.id.startsWith("p2p-nft"));
      if (house) return house.id;
    }
    return skip?.id ?? live[0].id;
  }

  return skip?.id ?? live[0]?.id ?? "skip";
}

function settle(s: State): State {
  if (s.phase === "over") return s;
  markBankrupt(s);
  if (detectWin(s)) return s;
  const me = actor(s);
  if (s.chainRoll && !me.bankrupt) {
    s.phase = "need-roll";
    s.choiceHint = "";
    pushLog(s, `${me.name} 再擲一次（K 線仍未收）`);
    return s;
  }
  shock(s);
  payYields(s);
  markBankrupt(s);
  if (detectWin(s)) return s;
  s.chainRoll = false;
  s.sixChain = 0;
  advance(s);
  return s;
}

function shock(s: State) {
  const prev: Record<Coin, number> = { ...s.prices };
  for (const c of COINS) {
    const vol = s.bases[c] * (0.02 + (s.fear / 100) * 0.055);
    const noise = clamp(gauss() * vol, -2.6 * vol, 2.6 * vol);
    s.deltas[c] = r2(s.deltas[c] * 0.9 + noise);
  }
  sync(s);
  let ret = 0;
  for (const c of COINS) ret += (s.prices[c] - prev[c]) / prev[c];
  const avg = ret / 3;
  s.fear = r2(clamp(s.fear * 0.9 + 42 * 0.1 - avg * 160, 2, 98));
  s.liquidity = r2(clamp(s.liquidity * 0.92 + 58 * 0.08 + avg * 36, 8, 98));
  s.tick += 1;
  for (const c of COINS) {
    s.hist[c] = [...s.hist[c], { t: s.tick, c: s.prices[c] }].slice(-36);
  }
  pushLog(
    s,
    `收線 BTC ${px(s.prices.BTC)} · ETH ${px(s.prices.ETH)} · XRP ${px(s.prices.XRP)}`,
  );
}

function payYields(s: State) {
  const me = actor(s);
  if (s.feePot > 0) {
    s.liquidity = r2(clamp(s.liquidity + Math.min(6, s.feePot / 30), 0, 100));
    pushLog(s, `交易費 ${money(s.feePot)} 流回流動性`);
    s.feePot = 0;
  }
  if (me.miner && !me.bankrupt) {
    const pay = r2(4 * (0.55 + s.liquidity / 200) * (1 - s.fear / 280));
    me.cash = r2(me.cash + pay);
    pushLog(s, `${me.name} 挖礦產出 ${money(pay)}`);
  }
}

function markBankrupt(s: State) {
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    if (p.bankrupt) continue;
    if (netWorth(s, i) >= 15) continue;
    p.bankrupt = true;
    p.cash = 0;
    p.bags = { BTC: 0, ETH: 0, XRP: 0 };
    p.miner = false;
    for (const n of s.nfts) if (n.owner === i) {
      n.owner = null;
      n.level = 1;
    }
    pushLog(s, `${p.name} 淨值跌破 15，強制平倉破產`);
  }
}

function detectWin(s: State): boolean {
  const alive = s.players
    .map((p, i) => ({ p, i, net: netWorth(s, i) }))
    .filter(({ p }) => !p.bankrupt);
  if (alive.length <= 1) {
    const only = alive[0];
    s.winner = only ? only.i : s.turn;
    s.winReason = "wipe";
    s.phase = "over";
    pushLog(s, only ? `${only.p.name} 是最後還在場上的人` : "場上沒有人了");
    return true;
  }
  const rich = alive.filter(({ net }) => net >= WIN).sort((a, b) => b.net - a.net);
  if (rich.length) {
    s.winner = rich[0].i;
    s.winReason = "net";
    s.phase = "over";
    pushLog(s, `${rich[0].p.name} 淨值到 ${money(rich[0].net)}，破 100,000`);
    return true;
  }
  return false;
}

function advance(s: State) {
  const prev = s.turn;
  for (let k = 1; k <= 4; k++) {
    const i = (prev + k) % 4;
    if (!s.players[i].bankrupt) {
      s.turn = i;
      if (i <= prev) s.round += 1;
      s.phase = "need-roll";
      s.choiceHint = "";
      s.dice = 0;
      return;
    }
  }
  s.phase = "over";
}
