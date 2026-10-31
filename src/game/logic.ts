export const COINS = ["BTC", "ETH", "XRP"] as const;
export type Coin = (typeof COINS)[number];

export const WIN = 10_000;
export const START_CASH = 150;
export const STIPEND = 20;
export const MINE_COST = 36;
export const FEE = 0.025;
export const BOARD = 40;
export const STEAL_AT = 30;
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
  | "tax"
  | "p2p";

export type TileDef = {
  kind: TileKind;
  label: string;
  coin?: Coin;
  nft?: number;
};

export const TILES: TileDef[] = [
  { kind: "start", label: "起點" },
  { kind: "spot", label: "BTC", coin: "BTC" },
  { kind: "nft", label: "冷庫", nft: 0 },
  { kind: "fund", label: "基本面" },
  { kind: "spot", label: "ETH", coin: "ETH" },
  { kind: "nft", label: "機房", nft: 1 },
  { kind: "mkt", label: "市場" },
  { kind: "spot", label: "XRP", coin: "XRP" },
  { kind: "nft", label: "天台", nft: 2 },
  { kind: "mine", label: "挖礦" },
  { kind: "air", label: "空投" },
  { kind: "spot", label: "BTC", coin: "BTC" },
  { kind: "nft", label: "港口", nft: 3 },
  { kind: "fund", label: "基本面" },
  { kind: "spot", label: "ETH", coin: "ETH" },
  { kind: "nft", label: "礦機", nft: 4 },
  { kind: "mkt", label: "市場" },
  { kind: "spot", label: "XRP", coin: "XRP" },
  { kind: "nft", label: "節點", nft: 5 },
  { kind: "tax", label: "交稅" },
  { kind: "p2p", label: "內盤" },
  { kind: "spot", label: "BTC", coin: "BTC" },
  { kind: "nft", label: "機櫃", nft: 6 },
  { kind: "mkt", label: "市場" },
  { kind: "spot", label: "ETH", coin: "ETH" },
  { kind: "nft", label: "衛星", nft: 7 },
  { kind: "fund", label: "基本面" },
  { kind: "spot", label: "XRP", coin: "XRP" },
  { kind: "nft", label: "驗證", nft: 8 },
  { kind: "mkt", label: "市場" },
  { kind: "steal", label: "盜錢包" },
  { kind: "spot", label: "BTC", coin: "BTC" },
  { kind: "nft", label: "算力", nft: 9 },
  { kind: "mkt", label: "市場" },
  { kind: "spot", label: "ETH", coin: "ETH" },
  { kind: "nft", label: "閘道", nft: 10 },
  { kind: "fund", label: "基本面" },
  { kind: "spot", label: "XRP", coin: "XRP" },
  { kind: "nft", label: "備援", nft: 11 },
  { kind: "mkt", label: "市場" },
];

/** Clockwise from the bottom-right corner on an 11×11 pit. Column, row are 1-indexed. */
export const COORDS: ReadonlyArray<readonly [number, number]> = buildCoords();

function buildCoords(): ReadonlyArray<readonly [number, number]> {
  const n = 11;
  const cells: Array<readonly [number, number]> = [];
  for (let col = n; col >= 1; col--) cells.push([col, n]);
  for (let row = n - 1; row >= 1; row--) cells.push([1, row]);
  for (let col = 2; col <= n; col++) cells.push([col, 1]);
  for (let row = 2; row <= n - 1; row++) cells.push([n, row]);
  return cells;
}

export type Candle = { t: number; o: number; h: number; l: number; c: number };
export type Phase = "need-roll" | "moving" | "need-choice" | "card" | "steal-roll" | "over";
export type Card = {
  title: string;
  body: string;
  mode: "info" | "jump";
  jump?: number | "back3";
};
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
  faces: [number, number];
  /** 1 = Free，2–6 = X，0 = 還沒擲。 */
  airFace: number;
  stealHits: number;
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
  if (n < 25) return "極端恐懼";
  if (n < 40) return "恐懼";
  if (n < 55) return "中性";
  if (n < 75) return "貪婪";
  return "極端貪婪";
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
  let price = base;
  for (let i = 0; i < 16; i++) {
    const open = price;
    const shock = clamp(gauss() * base * 0.014, -base * 0.045, base * 0.045);
    price = quote(base, price - base + shock);
    const wick = Math.abs(shock) * 0.45;
    hist.push(bar(i, open, price, wick));
  }
  return { hist, delta: r2(price - base), price };
}

function bar(t: number, open: number, close: number, wick: number): Candle {
  return {
    t,
    o: r4(open),
    h: r4(Math.max(open, close) + wick),
    l: r4(Math.max(0.0001, Math.min(open, close) - wick)),
    c: r4(close),
  };
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
    faces: [0, 0],
    airFace: 0,
    stealHits: 0,
    stepsLeft: 0,
    bases,
    deltas,
    prices,
    hist,
    fear: 50,
    liquidity: 50,
    nfts: [
      { key: "cold", name: "冷庫", cost: 40, upgrade: 150, level: 1, owner: null },
      { key: "rig", name: "機房", cost: 56, upgrade: 150, level: 1, owner: null },
      { key: "roof", name: "天台", cost: 78, upgrade: 150, level: 1, owner: null },
      { key: "port", name: "港口", cost: 48, upgrade: 150, level: 1, owner: null },
      { key: "asic", name: "礦機", cost: 64, upgrade: 150, level: 1, owner: null },
      { key: "node", name: "節點", cost: 88, upgrade: 150, level: 1, owner: null },
      { key: "rack", name: "機櫃", cost: 52, upgrade: 150, level: 1, owner: null },
      { key: "sat", name: "衛星", cost: 96, upgrade: 150, level: 1, owner: null },
      { key: "audit", name: "驗證", cost: 70, upgrade: 150, level: 1, owner: null },
      { key: "hash", name: "算力", cost: 110, upgrade: 150, level: 1, owner: null },
      { key: "gate", name: "閘道", cost: 84, upgrade: 150, level: 1, owner: null },
      { key: "spare", name: "備援", cost: 120, upgrade: 150, level: 1, owner: null },
    ],
    feePot: 0,
    log: [
      "盤口開啟。四人各持 150 USDT。恐貪 50（越高越貪婪）、流動性居中。淨值先到 10,000，或讓其餘三人破產。",
      "每次擲三顆：兩顆點數骰走路，一顆空投骰。踩到空投直接領。盜錢包要兩顆合計 12 點。",
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
  if (state.players[state.turn].bankrupt) return state;
  if (state.phase === "steal-roll") return rollStealPair(state);
  if (state.phase !== "need-roll") return state;
  const s = structuredClone(state) as State;
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  const air = 1 + Math.floor(Math.random() * 6);
  s.faces = [a, b];
  s.airFace = air;
  s.dice = a + b;
  s.stepsLeft = a + b;
  s.phase = "moving";
  const me = actor(s);
  const word = air === 1 ? "Free" : "X";
  if (air === 1) {
    const drop = giveCoins(s, me);
    pushLog(s, `${me.name} 擲出 ${a} 與 ${b}，空投骰 Free，入帳 ${qty(drop.q)} ${drop.c}`);
  } else {
    pushLog(s, `${me.name} 擲出 ${a} 與 ${b}，空投骰 X`);
  }
  return s;
}

function giveCoins(s: State, me: Player): { c: Coin; q: number; value: number } {
  const c = COINS[Math.floor(Math.random() * 3)];
  const value = r2(8 + Math.random() * 18);
  const q = r4(value / Math.max(0.0001, s.prices[c]));
  me.bags[c] = r4(me.bags[c] + q);
  return { c, q, value };
}

function rollStealPair(state: State): State {
  const s = structuredClone(state) as State;
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  s.faces = [a, b];
  s.airFace = 0;
  s.dice = a + b;
  const me = actor(s);
  if (a + b === 12) {
    pushLog(s, `${me.name} 擲出 ${a} 與 ${b}，合計 12，可以盜錢包`);
    return openSteal(s);
  }
  s.card = {
    title: "盜錢包 · 點數不足",
    body: `${me.name} 擲出 ${a} 與 ${b}，合計 ${a + b}。要兩顆點數骰加起來剛好 12 才能盜。`,
    mode: "info",
  };
  s.phase = "card";
  pushLog(s, `${me.name} 擲出 ${a} 與 ${b}，合計 ${a + b}，沒有盜成`);
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
    const drop = giveCoins(s, me);
    s.card = {
      title: "空投",
      body: `踩到空投，直接入帳。${me.name} 收到 ${qty(drop.q)} ${drop.c}，約值 ${money(drop.value)} USDT。`,
      mode: "info",
    };
    pushLog(s, `${me.name} 空投 ${qty(drop.q)} ${drop.c}`);
    s.phase = "card";
    return s;
  }
  if (tile.kind === "tax") {
    const due = r2(me.cash * 0.1);
    me.cash = r2(me.cash - due);
    s.card = {
      title: "交稅",
      body: `抽走 ${me.name} 持有 USDT 的 10%，即 ${money(due)} USDT。幣和房子不課這筆。`,
      mode: "info",
    };
    pushLog(s, `${me.name} 交稅 ${money(due)} USDT`);
    s.phase = "card";
    return s;
  }
  if (tile.kind === "steal") {
    s.stealHits = 0;
    s.faces = [0, 0];
    s.dice = 0;
    s.phase = "steal-roll";
    s.choiceHint = "停在盜錢包。擲兩顆點數骰，合計剛好 12 才能拿走一名對手 50% 的 USDT。";
    pushLog(s, `${me.name} 停在盜錢包，擲兩顆點數骰`);
    return s;
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
    s.choiceHint = "玩家內部成交，價格用現價。發起人付 2.5%。也可以把 NFT 房賣給 USDT 最多的對手。";
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
      body: `${me.name} 擲出 12 點，但其他人的 USDT 都不足 1。`,
      mode: "info",
    };
    s.phase = "card";
    return s;
  }
  s.choiceHint = "兩顆點數骰合計 12。指定一名對手，拿走其 USDT 的 50%。幣與 NFT 不動。";
  s.phase = "need-choice";
  return s;
}

function applyFund(s: State) {
  const rolln = Math.floor(Math.random() * 10);
  const me = actor(s);
  if (rolln === 0) {
    me.cash = r2(me.cash + 40);
    s.card = { title: "基本面 · 銀行出錯", body: "帳戶多了 40 USDT。跟大富翁那張「銀行出錯」一樣，直接入錢包。", mode: "info" };
  } else if (rolln === 1) {
    me.cash = r2(me.cash + 28);
    s.card = { title: "基本面 · 股息", body: "持股分紅，收下 28 USDT。", mode: "info" };
  } else if (rolln === 2) {
    me.cash = r2(me.cash + 22);
    s.card = { title: "基本面 · 顧問費", body: "有人請你看盤，顧問費 22 USDT。", mode: "info" };
  } else if (rolln === 3) {
    const pay = r2(Math.min(me.cash, 25));
    me.cash = r2(me.cash - pay);
    s.card = { title: "基本面 · 住院費", body: `付出 ${money(pay)} USDT。`, mode: "info" };
  } else if (rolln === 4) {
    me.cash = r2(me.cash + 36);
    s.card = { title: "基本面 · 保險到期", body: "保單滿期，領回 36 USDT。", mode: "info" };
  } else if (rolln === 5) {
    const got = fromEach(s, 8);
    s.card = { title: "基本面 · 生日", body: `每位對手給你 8 USDT，實收 ${money(got)}。`, mode: "info" };
  } else if (rolln === 6) {
    const bill = repairBill(s);
    s.card = {
      title: "基本面 · 機房維修",
      body: bill.houses
        ? `${bill.houses} 間房子按等級計，應付 ${money(bill.due)}，實付 ${money(bill.pay)} USDT。`
        : "你沒有房子，這張維修單不用付錢。",
      mode: "info",
    };
  } else if (rolln === 7) {
    bumpBase(s, "BTC", 0.08);
    s.card = { title: "基本面 · 減半敘事", body: "BTC 基本面 +8%。報價即時變，K 線等回合收盤才畫上。", mode: "info" };
  } else if (rolln === 8) {
    for (const c of COINS) bumpBase(s, c, -0.06);
    s.card = { title: "基本面 · 監管函", body: "三種基本面都 −6%。", mode: "info" };
  } else {
    s.card = {
      title: "基本面 · 前進到起點",
      body: "直接去起點，並領 20 USDT。跟大富翁經過起點領薪水一樣。",
      mode: "jump",
      jump: 0,
    };
  }
  sync(s);
  pushLog(s, `${me.name} 抽到「${s.card?.title ?? "基本面"}」`);
}

function applyMarketCard(s: State) {
  const rolln = Math.floor(Math.random() * 12);
  const me = actor(s);
  const coin = COINS[Math.floor(Math.random() * 3)];
  const airAt = TILES.findIndex((t) => t.kind === "air");
  const taxAt = TILES.findIndex((t) => t.kind === "tax");
  const btcAt = nearestTile(me.pos, "spot", "BTC");
  if (rolln === 0) {
    s.card = { title: "市場 · 退後三格", body: "棋子退回三格，落到哪一格就結算哪一格。", mode: "jump", jump: "back3" };
  } else if (rolln === 1) {
    s.card = { title: "市場 · 前往空投", body: "直接送到空投格，落地就領幣。", mode: "jump", jump: airAt };
  } else if (rolln === 2) {
    s.card = { title: "市場 · 前往交稅", body: "直接送到交稅，落地抽 10% USDT。", mode: "jump", jump: taxAt };
  } else if (rolln === 3) {
    s.card = { title: "市場 · 前往盜錢包", body: "直接送到右上角。到了再擲兩顆點數骰，合計 12 才能盜。", mode: "jump", jump: STEAL_AT };
  } else if (rolln === 4) {
    s.card = { title: "市場 · 最近的 BTC", body: "前進到下一個 BTC 現貨，可以在那裡買賣。", mode: "jump", jump: btcAt };
  } else if (rolln === 5) {
    const paid = toEach(s, 6);
    s.card = { title: "市場 · 你是主席", body: `你要給每位對手 6 USDT，實付 ${money(paid)}。`, mode: "info" };
  } else if (rolln === 6) {
    const got = fromEach(s, 6);
    s.card = { title: "市場 · 分紅", body: `每位對手給你 6 USDT，實收 ${money(got)}。`, mode: "info" };
  } else if (rolln === 7) {
    me.cash = r2(me.cash + 30);
    s.card = { title: "市場 · 股票變現", body: "賣出一筆，收下 30 USDT。", mode: "info" };
  } else if (rolln === 8) {
    const pay = r2(Math.min(me.cash, 20));
    me.cash = r2(me.cash - pay);
    s.card = { title: "市場 · 超速罰款", body: `罰 ${money(pay)} USDT。`, mode: "info" };
  } else if (rolln === 9) {
    s.fear = r2(clamp(s.fear - 16, 0, 100));
    for (const c of COINS) bumpDelta(s, c, -0.05);
    s.card = { title: "市場 · 恐懼蔓延", body: "恐貪 −16。三種市場價各 −5% 基本面。", mode: "info" };
  } else if (rolln === 10) {
    bumpDelta(s, coin, 0.1);
    s.card = { title: "市場 · 軋空", body: `${coin} 市場價 +10% 基本面。`, mode: "info" };
  } else {
    s.card = {
      title: "市場 · 前進到起點",
      body: "行情把你送回起點，並領 20 USDT。",
      mode: "jump",
      jump: 0,
    };
  }
  sync(s);
  pushLog(s, `${me.name} 抽到「${s.card?.title ?? "市場"}」`);
}

function nearestTile(from: number, kind: TileKind, coin?: Coin): number {
  for (let i = 1; i <= BOARD; i++) {
    const idx = (from + i) % BOARD;
    const tile = TILES[idx];
    if (tile.kind === kind && (coin === undefined || tile.coin === coin)) return idx;
  }
  return from;
}

function fromEach(s: State, n: number): number {
  const me = actor(s);
  let got = 0;
  s.players.forEach((p, i) => {
    if (i === s.turn || p.bankrupt) return;
    const pay = r2(Math.min(p.cash, n));
    p.cash = r2(p.cash - pay);
    got = r2(got + pay);
  });
  me.cash = r2(me.cash + got);
  return got;
}

function toEach(s: State, n: number): number {
  const me = actor(s);
  let paid = 0;
  s.players.forEach((p, i) => {
    if (i === s.turn || p.bankrupt) return;
    const pay = r2(Math.min(Math.max(0, me.cash), n));
    me.cash = r2(me.cash - pay);
    p.cash = r2(p.cash + pay);
    paid = r2(paid + pay);
  });
  return paid;
}

function repairBill(s: State): { houses: number; due: number; pay: number } {
  const me = actor(s);
  const houses = s.nfts.filter((n) => n.owner === s.turn);
  const due = houses.reduce((sum, n) => sum + 8 * n.level, 0);
  const pay = r2(Math.min(me.cash, due));
  me.cash = r2(me.cash - pay);
  return { houses: houses.length, due, pay };
}

function bumpBase(s: State, c: Coin, pct: number) {
  s.bases[c] = r2(Math.max(INITIAL[c] * 0.35, s.bases[c] * (1 + pct)));
}

function bumpDelta(s: State, c: Coin, pctOfBase: number) {
  s.deltas[c] = r2(s.deltas[c] + s.bases[c] * pctOfBase);
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
        detail: disabled ? "USDT 不足" : `拿走 ${money(take)} USDT`,
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
        detail: afford ? `${money(nft.cost)} USDT` : "USDT 不夠",
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
      detail: nft.level >= MAX_NFT_LEVEL ? "已滿級" : afford ? `${money(cost)} USDT` : "USDT 不夠",
      tone: "primary",
      disabled: !afford,
    },
    { id: "skip", label: "不升級", detail: "維持現有骰數", tone: "ghost" },
  ];
}

function spotOptions(s: State, c: Coin): Opt[] {
  const me = actor(s);
  const price = s.prices[c];
  const steps = [0.1, 0.5, 1, 2, 5];
  const opts: Opt[] = [];
  for (const q of steps) {
    const cost = q * price * (1 + FEE);
    opts.push({
      id: `buy:${c}:${q}`,
      label: `買 ${qty(q)}`,
      detail: me.cash >= cost ? `${money(cost)} 含費` : "USDT 不夠",
      tone: "primary",
      disabled: me.cash < cost,
    });
  }
  for (const q of steps) {
    const notional = q * price;
    opts.push({
      id: `sell:${c}:${q}`,
      label: `賣 ${qty(q)}`,
      detail: me.bags[c] + 1e-9 >= q ? `約 ${money(notional * (1 - FEE))} 入袋` : "持倉太少",
      tone: "ghost",
      disabled: me.bags[c] + 1e-9 < q,
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
        : "對手 USDT 或持倉不夠",
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
        detail: ok ? `${qty(q)} · ${money(notional + fee)}` : "USDT 不夠",
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
  const s0 = state;
  const me0 = s0.players[s0.turn];
  const tile0 = TILES[me0.pos];
  const parts0 = id.split(":");
  if ((parts0[0] === "buy" || parts0[0] === "sell") && tile0.kind === "spot" && tile0.coin === parts0[1]) {
    const n = Math.round(Number(parts0[2]) * 10) / 10;
    if (!Number.isFinite(n) || n < 0.1) return state;
    const s = structuredClone(state) as State;
    if (!spotTrade(s, parts0[1] as Coin, parts0[0], n)) return state;
    return settle(s);
  }
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
    pushLog(s, `${me.name} 盜走 ${victim.name} ${money(take)} USDT（50%）`);
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
  const q = Math.min(me.bags[c], Math.round(n * 10) / 10);
  const notional = q * price;
  if (q < 0.1) return false;
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
  const jump = state.card.jump;
  const s = structuredClone(state) as State;
  s.card = null;
  if (mode === "jump") {
    const me = actor(s);
    if (jump === "back3") me.pos = (me.pos + BOARD - 3) % BOARD;
    else if (typeof jump === "number") me.pos = jump;
    if (jump === 0) {
      me.cash = r2(me.cash + STIPEND);
      pushLog(s, `${me.name} 被送到起點，領 ${money(STIPEND)} USDT`);
      return settle(s);
    }
    pushLog(s, `${me.name} 被送到 ${TILES[me.pos].label}`);
    return land(s);
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
    if (buy && me.cash >= nft.cost * mult && s.fear > (me.style === "whale" ? 18 : 32)) {
      return buy.id;
    }
    const cost = upgradeCost(nft.level);
    const cushion = me.style === "whale" ? 30 : me.style === "mm" ? 70 : 110;
    if (up && nft.level < MAX_NFT_LEVEL && me.cash >= cost + cushion && s.fear > 26) {
      return up.id;
    }
    return skip?.id ?? live[0].id;
  }

  if (tile.kind === "mine") {
    const buy = live.find((o) => o.id === "mine");
    const floor = me.style === "whale" ? 70 : me.style === "mm" ? 95 : 120;
    if (buy && me.cash >= floor && s.fear > 30) return buy.id;
    return skip?.id ?? live[0].id;
  }

  if (tile.kind === "spot" && tile.coin) {
    const c = tile.coin;
    const price = s.prices[c];
    const avg = sma(s, c);
    const target = c === "BTC" ? 1 : c === "ETH" ? 8 : 80;
    if (me.style === "mm") {
      if (me.bags[c] > target * 1.25) {
        const sell = live.find((o) => o.id === `sell:${c}:0.5`) ?? live.find((o) => o.id.startsWith(`sell:${c}:`));
        if (sell) return sell.id;
      }
      if (me.bags[c] < target * 0.75 && price < avg * 1.04) {
        const buy = [...live].reverse().find((o) => o.id.startsWith(`buy:${c}:`));
        if (buy && me.cash > START_CASH * 0.35) return buy.id;
      }
      return skip?.id ?? live[0].id;
    }
    if (me.style === "whale") {
      if (price < avg * 1.03 && s.fear > 22) {
        const buy = [...live].reverse().find((o) => o.id.startsWith(`buy:${c}:`));
        if (buy) return buy.id;
      }
      if ((price > avg * 1.18 || s.fear < 28) && me.bags[c] > 0) {
        const sell = live.find((o) => o.id === `sell:${c}:0.5`) ?? live.find((o) => o.id.startsWith(`sell:${c}:`));
        if (sell) return sell.id;
      }
      return skip?.id ?? live[0].id;
    }
    if (s.fear < 32 && me.bags[c] > 0) {
      const sell = live.find((o) => o.id === `sell:${c}:0.5`) ?? live.find((o) => o.id.startsWith(`sell:${c}:`));
      if (sell) return sell.id;
    }
    if (price < avg * 0.97 && s.fear > 42) {
      const buy = live.find((o) => o.id.startsWith(`buy:${c}:`));
      if (buy) return buy.id;
    }
    return skip?.id ?? live[0].id;
  }

  if (tile.kind === "p2p") {
    if (s.fear < 36) {
      const sell = live.find((o) => o.id.startsWith("p2p-sell") && !o.disabled);
      if (sell && me.style !== "whale") return sell.id;
    }
    if (me.style === "whale" && s.fear > 40) {
      const buy = live.find((o) => o.id.startsWith("p2p-buy"));
      if (buy) return buy.id;
    }
    if (me.cash < 40 && s.fear < 30) {
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
  shock(s);
  payYields(s);
  markBankrupt(s);
  if (detectWin(s)) return s;
  advance(s);
  return s;
}

function shock(s: State) {
  const prev: Record<Coin, number> = { ...s.prices };
  for (const c of COINS) {
    const panic = (100 - s.fear) / 100;
    const vol = s.bases[c] * (0.02 + panic * 0.055);
    const noise = clamp(gauss() * vol, -2.6 * vol, 2.6 * vol);
    s.deltas[c] = r2(s.deltas[c] * 0.9 + noise);
  }
  sync(s);
  let ret = 0;
  for (const c of COINS) ret += (s.prices[c] - prev[c]) / prev[c];
  const avg = ret / 3;
  s.fear = r2(clamp(s.fear * 0.9 + 50 * 0.1 + avg * 160, 2, 98));
  s.liquidity = r2(clamp(s.liquidity * 0.92 + 58 * 0.08 + avg * 36, 8, 98));
  s.tick += 1;
  for (const c of COINS) {
    const open = prev[c];
    const close = s.prices[c];
    const wick = Math.abs(close - open) * 0.35 + open * 0.004;
    s.hist[c] = [...s.hist[c], bar(s.tick, open, close, wick)].slice(-36);
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
    const pay = r2(4 * (0.55 + s.liquidity / 200) * (0.65 + s.fear / 280));
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
    pushLog(s, `${rich[0].p.name} 淨值到 ${money(rich[0].net)}，破 10,000`);
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
      s.faces = [0, 0];
      s.airFace = 0;
      s.stealHits = 0;
      return;
    }
  }
  s.phase = "over";
}
