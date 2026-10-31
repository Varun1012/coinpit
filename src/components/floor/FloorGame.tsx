import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  COINS,
  COORDS,
  TILES,
  WIN,
  type Coin,
  type Opt,
  type State,
  currentOptions,
  fearLabel,
  liqLabel,
  liqTn,
  money,
  netWorth,
  px,
  qty,
} from "@/game/logic";
import { useFloor } from "@/game/store";
import { playLog, sfxStep, unlockSfx } from "@/game/sfx";
import { useOnline, type NetSpec } from "@/game/online";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useNightScore() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(true);
  useEffect(() => {
    let enabled = true;
    try {
      enabled = localStorage.getItem("coinpit-music") !== "0";
    } catch {
      enabled = true;
    }
    setOn(enabled);
    const a = new Audio(`${import.meta.env.BASE_URL}music/night-pit.ogg`);
    a.loop = true;
    a.volume = 0.62;
    audio.current = a;
    const unlock = () => {
      unlockSfx();
      try {
        if (localStorage.getItem("coinpit-music") === "0") return;
      } catch {
        /* ignore */
      }
      void a.play().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      a.pause();
    };
  }, []);
  function toggle() {
    const a = audio.current;
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem("coinpit-music", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!a) return;
    if (next) void a.play().catch(() => {});
    else a.pause();
  }
  return { on, toggle };
}

export function FloorGame() {
  const solo = useFloor((s) => s.game);
  const saved = useFloor((s) => s.saved);
  const boot = useFloor((s) => s.boot);
  const start = useFloor((s) => s.start);
  const resume = useFloor((s) => s.resume);
  const [coin, setCoin] = useState<Coin>("BTC");
  const [rules, setRules] = useState(false);
  const [net, setNet] = useState<NetSpec | null>(null);
  const [nick, setNick] = useState("你");
  const [joinCode, setJoinCode] = useState("");
  const online = useOnline(net);
  const music = useNightScore();
  const game = net ? (net.host ? solo : online.guestGame) : solo;
  const authority = !net || net.host;
  const localSeat = net ? (net.host ? 0 : online.mySeat) : 0;

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (!authority || !game || game.phase === "over") return;
    if (game.phase === "moving") {
      const t = setTimeout(() => useFloor.getState().step(), 120);
      return () => clearTimeout(t);
    }
    const p = game.players[game.turn];
    if (p.human) return;
    const wait = game.phase === "need-roll" || game.phase === "steal-roll" ? 420 : game.phase === "card" ? 1100 : 760;
    const t = setTimeout(() => useFloor.getState().ai(), wait);
    return () => clearTimeout(t);
  }, [game, authority]);

  useEffect(() => {
    if (!game) return;
    const tile = TILES[game.players[game.turn].pos];
    if (game.phase === "need-choice" && tile.coin) setCoin(tile.coin);
  }, [game]);

  const heard = useRef("");
  const stepped = useRef(-1);
  useEffect(() => {
    if (!game) return;
    const line = game.log[0] ?? "";
    if (line && line !== heard.current) {
      if (heard.current) playLog(line);
      heard.current = line;
    }
    const pos = game.players[game.turn]?.pos ?? -1;
    if (game.phase === "moving" && stepped.current !== -1 && pos !== stepped.current) sfxStep();
    stepped.current = pos;
  }, [game]);

  function actRoll() {
    if (net && !net.host) online.sendAct("roll");
    else useFloor.getState().roll();
  }
  function actDismiss() {
    if (net && !net.host) online.sendAct("dismiss");
    else useFloor.getState().dismiss();
  }
  function actPick(id: string) {
    if (net && !net.host) online.sendAct("pick", id);
    else useFloor.getState().pick(id);
  }
  function leaveRoom() {
    if (net?.host) useFloor.getState().drop();
    setNet(null);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== "Space" && e.code !== "Enter") return;
      const g = net ? (net.host ? useFloor.getState().game : online.guestGame) : useFloor.getState().game;
      if (!g) return;
      const mine = net ? (net.host ? 0 : online.mySeat) : 0;
      if (g.turn !== mine || !g.players[g.turn].human) return;
      if (g.phase === "need-roll" || g.phase === "steal-roll") {
        e.preventDefault();
        actRoll();
      } else if (g.phase === "card") {
        e.preventDefault();
        actDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!game) {
    if (net) {
      return (
        <main className="pit min-h-screen px-4 py-8 text-fg">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <p className="font-mono text-xs text-primary">線上房間</p>
            <h1 className="font-mono text-5xl tracking-widest">{net.code}</h1>
            <p className="text-sm text-muted">{online.status}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {online.roster.map((row) => (
                <li key={row} className="rounded-xl border border-line bg-surface px-3 py-3">
                  {row}
                </li>
              ))}
            </ul>
            {online.failed.length > 0 && (
              <p className="text-sm text-accent">連不上：{online.failed.join("、")}。對方可能在嚴格的網路後面。</p>
            )}
            {net.host && (
              <button
                type="button"
                onClick={online.begin}
                className="h-12 rounded-xl bg-primary font-medium text-bg"
              >
                開局（空位 AI 替補）
              </button>
            )}
            <button type="button" onClick={leaveRoom} className="h-12 rounded-xl border border-line">
              離開房間
            </button>
          </div>
        </main>
      );
    }
    return (
      <main className="pit min-h-screen px-4 py-8 text-fg">
        <div className="mx-auto flex max-w-lg flex-col gap-6">
          <p className="font-mono text-xs tracking-widest text-primary">四人夜盤 · 模擬</p>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-5xl font-medium tracking-tight">幣盤</h1>
            <button
              type="button"
              onClick={music.toggle}
              className="h-11 rounded-xl border border-line bg-surface px-3 text-sm"
            >
              {music.on ? "夜盤配樂 · 開" : "夜盤配樂 · 關"}
            </button>
          </div>
          <p className="text-base leading-relaxed text-muted">
            價格 = 基本面 P* + 市場 PΔ。每名玩家結束回合收一根線。冷庫、機房、天台、港口要等別人踩到才收租。
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="rounded-xl border border-line bg-surface px-3 py-3">
              開局 150 USDT。恐貪 50（中性），流動性在正中。順時針走。
            </li>
            <li className="rounded-xl border border-line bg-surface px-3 py-3">
              起點在右下，空投在左下。踩到空投就直接領幣。每經過起點免費 20 USDT。
            </li>
            <li className="rounded-xl border border-line bg-surface px-3 py-3">
              每次擲三顆：兩顆點數骰走路，一顆空投骰（Free 會順便入帳，X 就沒有）。右上角盜錢包要兩顆點數骰合計 12 才能盜 50% USDT。
            </li>
            <li className="rounded-xl border border-line bg-surface px-3 py-3">
              房子一級過路費擲一顆骰，1–6 USDT。每升一級多一顆骰。升到二級要 150 USDT，之後每級再加 150。
            </li>
            <li className="rounded-xl border border-line bg-surface px-3 py-3">
              可跟朋友開房，空位由 AI 替補。淨值先到 10,000 USDT 即勝。
            </li>
          </ul>
          <button
            type="button"
            onClick={start}
            className="h-12 rounded-xl bg-primary text-base font-medium text-bg"
          >
            跟 AI 開局
          </button>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">你的名字</span>
            <input
              value={nick}
              maxLength={12}
              onChange={(e) => setNick(e.target.value)}
              className="h-12 rounded-xl border border-line bg-bg px-3"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              setNet({
                code: Math.random().toString(36).slice(2, 6).toUpperCase(),
                host: true,
                name: nick.trim() || "你",
              })
            }
            className="h-12 rounded-xl border border-primary text-primary"
          >
            開房對決
          </button>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = joinCode.trim().toUpperCase();
              if (code.length < 4) return;
              setNet({ code, host: false, name: nick.trim() || "你" });
            }}
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="房間號碼"
              maxLength={4}
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 font-mono tracking-widest"
            />
            <button type="submit" className="h-12 rounded-xl border border-line px-4">
              加入
            </button>
          </form>
          {saved && (
            <button
              type="button"
              onClick={resume}
              className="h-12 rounded-xl border border-line bg-surface text-sm text-fg"
            >
              繼續上一局
            </button>
          )}
        </div>
      </main>
    );
  }

  const me = game.players[game.turn];
  const opts = currentOptions(game);
  const human = game.turn === localSeat && me.human && !me.bankrupt;
  const last = game.hist[coin][game.hist[coin].length - 1]?.c ?? game.prices[coin];
  const up = game.prices[coin] >= last;

  return (
    <main className="pit relative h-dvh overflow-hidden text-fg">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-2 px-2 py-2 lg:px-3">
        <header className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-medium">幣盤</h1>
            <p className="font-mono text-xs text-primary">{net ? `房間 ${net.code}` : `第 ${game.round} 輪`}</p>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={music.toggle} className="h-9 rounded-lg border border-line bg-surface px-2 text-xs">
              {music.on ? "配樂開" : "配樂關"}
            </button>
            <button type="button" onClick={() => setRules((v) => !v)} className="h-9 rounded-lg border border-line bg-surface px-2 text-xs">
              規則
            </button>
            <button
              type="button"
              onClick={() => (net ? leaveRoom() : useFloor.getState().abandon())}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-xs"
            >
              封面
            </button>
            <button
              type="button"
              onClick={() => {
                if (net) {
                  if (net.host) online.begin();
                  return;
                }
                useFloor.getState().start();
              }}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-xs"
            >
              重開
            </button>
          </div>
        </header>

        {rules && (
          <section className="absolute inset-x-3 top-14 z-20 rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted shadow-lg">
            棋盤 40 格，順時針。每次擲三顆：兩顆點數骰相加走路，一顆空投骰只有 Free 會順便入帳。
            踩到空投格則直接領幣。經過起點免費 20 USDT。房子別人踩到才收租。
            盜錢包要兩顆點數骰合計 12。基本面和市場卡會罰款、發錢、改位置。淨值 10,000 USDT 即勝。
          </section>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-2 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1">
          <div className="board-slot min-h-0">
            <div className="board-frame">
              <Board game={game} />
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <Roster game={game} onSteal={actPick} />
            <Dock
              game={game}
              opts={opts}
              human={human}
              onRoll={actRoll}
              onDismiss={actDismiss}
              onPick={actPick}
            />
            <section className="hidden min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface p-3 lg:flex">
              <div className="mb-1 flex items-end justify-between gap-2">
                <p className={cx("font-mono text-lg", up ? "text-primary" : "text-danger")}>
                  {coin} {px(game.prices[coin])}
                </p>
                <div className="flex gap-1">
                  {COINS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCoin(c)}
                      className={cx(
                        "h-8 rounded-lg px-2 font-mono text-[10px]",
                        c === coin ? "bg-primary text-bg" : "border border-line text-muted",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={game.hist[coin].map((h) => ({ t: h.t, 價格: h.c }))}>
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-line)",
                        borderRadius: 12,
                        color: "var(--color-fg)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="價格"
                      stroke={up ? "var(--color-primary)" : "var(--color-danger)"}
                      fill={up ? "var(--color-primary)" : "var(--color-danger)"}
                      fillOpacity={0.16}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="hidden min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-surface p-3 font-mono text-xs leading-relaxed lg:block">
              {game.log.map((line, i) => (
                <p key={`${i}-${line}`} className={i === 0 ? "text-fg" : "text-muted"}>
                  {line}
                </p>
              ))}
            </section>
          </div>
        </div>
      </div>

      {game.phase === "over" && game.winner !== null && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5">
            <p className="font-mono text-xs text-primary">對局結束</p>
            <h2 className="mt-1 text-3xl font-medium">
              {game.players[game.winner].name}
              {game.players[game.winner].human ? " 贏了" : " 拿走這局"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {game.winReason === "wipe"
                ? "其餘玩家都已破產。"
                : `淨值 ${money(netWorth(game, game.winner))} USDT，越過 10,000。`}
            </p>
            <p className="mt-2 font-mono text-sm">
              你的淨值 {money(netWorth(game, localSeat < 0 ? 0 : localSeat))}
            </p>
            <button
              type="button"
              onClick={() => {
                if (net) {
                  if (net.host) online.begin();
                  return;
                }
                useFloor.getState().start();
              }}
              className="mt-4 h-12 w-full rounded-xl bg-primary font-medium text-bg"
            >
              再來一局
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Board({ game }: { game: State }) {
  const airWord = game.airFace === 1 ? "Free" : game.airFace > 1 ? "X" : "—";
  return (
    <div className="board-felt grid h-full w-full grid-cols-11 grid-rows-11 gap-[3px] p-1.5">
      {TILES.map((tile, index) => {
        const [col, row] = COORDS[index];
        const here = game.players.filter((p) => p.pos === index && !p.bankrupt);
        const nft = tile.nft !== undefined ? game.nfts[tile.nft] : null;
        const active = game.players[game.turn].pos === index;
        const paint = tilePaint(tile);
        return (
          <div
            key={tile.label + index}
            style={{ gridColumn: col, gridRow: row, background: paint.bg, color: paint.ink }}
            className={cx("tile3d", active && "tile-hot")}
          >
            <span className="tile-band" style={{ background: paint.band }} />
            <div className="flex items-center justify-between">
              {nft?.owner !== null && nft ? (
                <span className={cx("tile-lv", `tok-${nft.owner}`)}>{nft.level}</span>
              ) : (
                <span />
              )}
            </div>
            <p className="tile-name">{tile.label}</p>
            <div className="flex h-3 items-end gap-0.5">
              {here.map((p) => (
                <span key={p.id} className={cx("pawn", `tok-${game.players.indexOf(p)}`)} title={p.name} />
              ))}
            </div>
          </div>
        );
      })}
      <div className="plaza flex flex-col justify-between p-2" style={{ gridColumn: "2 / span 9", gridRow: "2 / span 9" }}>
        <div className="grid grid-cols-2 gap-2">
          <Meter k="恐貪" v={`${Math.round(game.fear)} · ${fearLabel(game.fear)}`} pct={game.fear} tone="accent" />
          <Meter k="流動性" v={`${liqLabel(game.liquidity)} · ${liqTn(game.liquidity)}`} pct={game.liquidity} tone="primary" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <div className="flex items-end gap-2">
            <Die value={game.faces?.[0] ?? 0} />
            <Die value={game.faces?.[1] ?? 0} />
            <WordDie face={game.airFace ?? 0} />
          </div>
          <p className="text-center text-sm font-medium text-[#143024]">
            {game.phase === "over"
              ? "收盤"
              : game.phase === "moving"
                ? `${meName(game)} 移動中`
                : game.phase === "steal-roll"
                  ? `${meName(game)} 要擲出 12`
                  : `${meName(game)} 的回合`}
          </p>
          <p className="text-center font-mono text-[11px] text-[#1f6b45]">
            點數 {game.dice > 0 ? `${game.faces[0]}+${game.faces[1]}=${game.dice}` : "—"} · 空投 {airWord}
          </p>
        </div>
      </div>
    </div>
  );
}

function tilePaint(tile: (typeof TILES)[number]): { bg: string; band: string; ink: string } {
  if (tile.kind === "start") return { bg: "#ff5d6c", band: "#ffe08a", ink: "#3b1020" };
  if (tile.kind === "air") return { bg: "#86efac", band: "#ecfccb", ink: "#14532d" };
  if (tile.kind === "tax") return { bg: "#fde047", band: "#fff7c2", ink: "#713f12" };
  if (tile.kind === "steal") return { bg: "#fb7185", band: "#ffe4e6", ink: "#4c0519" };
  if (tile.kind === "mine") return { bg: "#fdba74", band: "#ffedd5", ink: "#7c2d12" };
  if (tile.kind === "p2p") return { bg: "#67e8f9", band: "#ecfeff", ink: "#164e63" };
  if (tile.kind === "fund") return { bg: "#5eead4", band: "#ccfbf1", ink: "#134e4a" };
  if (tile.kind === "mkt") return { bg: "#fda4af", band: "#ffe4e6", ink: "#881337" };
  if (tile.coin === "BTC") return { bg: "#ffb020", band: "#c2410c", ink: "#431407" };
  if (tile.coin === "ETH") return { bg: "#93c5fd", band: "#1d4ed8", ink: "#172554" };
  if (tile.coin === "XRP") return { bg: "#d8b4fe", band: "#7e22ce", ink: "#3b0764" };
  const bands = ["#fff7ed", "#fef3c7", "#ecfccb", "#e0f2fe", "#fae8ff", "#ffe4e6", "#fef9c3", "#d1fae5", "#e0e7ff", "#ffedd5", "#cffafe", "#fce7f3"];
  const faces = ["#7dd3fc", "#c4b5fd", "#fdba74", "#6ee7b7", "#fde047", "#38bdf8", "#f9a8d4", "#bef264", "#fda4af", "#a5b4fc", "#2dd4bf", "#fed7aa"];
  const i = tile.nft ?? 0;
  return { bg: faces[i % faces.length], band: bands[i % bands.length], ink: "#1c1917" };
}

function meName(game: State) {
  return game.players[game.turn].name;
}

function Meter({
  k,
  v,
  pct,
  tone,
}: {
  k: string;
  v: string;
  pct: number;
  tone: "accent" | "primary";
}) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[#1f6b45]">{k}</p>
      <p className="truncate text-[11px] text-[#143024]">{v}</p>
      <div className="mt-1 h-1.5 rounded-full bg-white/50">
        <div
          className={cx("h-full rounded-full", tone === "accent" ? "bg-accent" : "bg-primary")}
          style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function WordDie({ face }: { face: number }) {
  const label = face === 1 ? "Free" : face > 1 ? "X" : "";
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    if (!face) return;
    setSpin(true);
    const t = setTimeout(() => setSpin(false), 480);
    return () => clearTimeout(t);
  }, [face]);
  return (
    <div
      className={cx("die die-air flex items-center justify-center", spin && "die-spin", face === 0 && "opacity-40")}
      aria-label={label ? `空投骰 ${label}` : "空投骰尚未擲"}
    >
      <span className={cx("font-mono text-[10px] font-bold text-[#1c140c]", label === "X" && "text-sm")}>{label}</span>
    </div>
  );
}

function Die({ value }: { value: number }) {
  const pip = (on: boolean) => (
    <span className={cx("h-1.5 w-1.5 rounded-full", on ? "bg-[#1c140c]" : "bg-transparent")} />
  );
  const n = value || 1;
  const map: Record<number, boolean[]> = {
    1: [false, false, false, false, true, false, false, false, false],
    2: [true, false, false, false, false, false, false, false, true],
    3: [true, false, false, false, true, false, false, false, true],
    4: [true, false, true, false, false, false, true, false, true],
    5: [true, false, true, false, true, false, true, false, true],
    6: [true, false, true, true, false, true, true, false, true],
  };
  const cells = map[n] ?? map[1];
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    if (!value) return;
    setSpin(true);
    const t = setTimeout(() => setSpin(false), 480);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div
      className={cx("die grid grid-cols-3 grid-rows-3 place-items-center p-1.5", spin && "die-spin", value === 0 && "opacity-35")}
      aria-label={value ? `骰子 ${value} 點` : "尚未擲骰"}
    >
      {cells.map((on, i) => (
        <span key={i}>{pip(value !== 0 && on)}</span>
      ))}
    </div>
  );
}

function Dock({
  game,
  opts,
  human,
  onRoll,
  onDismiss,
  onPick,
}: {
  game: State;
  opts: Opt[];
  human: boolean;
  onRoll: () => void;
  onDismiss: () => void;
  onPick: (id: string) => void;
}) {
  const me = game.players[game.turn];
  return (
    <section className="rounded-2xl border border-line bg-surface p-3">
      {game.phase === "card" && game.card && (
        <div>
          <h2 className="text-lg font-medium">{game.card.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{game.card.body}</p>
          {human ? (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-3 h-12 w-full rounded-xl bg-primary font-medium text-bg"
            >
              知道了
            </button>
          ) : (
            <p className="mt-3 font-mono text-xs text-muted">{me.name} 在看這張牌</p>
          )}
        </div>
      )}

      {game.phase === "need-choice" && (
        <div>
          <h2 className="text-sm font-medium">{TILES[me.pos].label}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{game.choiceHint}</p>
          {human ? (
            <div className="mt-2 grid max-h-28 grid-cols-2 gap-2 overflow-y-auto">
              {opts.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => onPick(o.id)}
                  className={cx(
                    "min-h-11 rounded-xl px-3 py-2 text-left",
                    o.disabled && "opacity-40",
                    o.tone === "primary" && "bg-primary text-bg",
                    o.tone === "danger" && "bg-accent text-bg",
                    o.tone === "ghost" && "border border-line bg-surface-2 text-fg",
                  )}
                >
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span
                    className={cx(
                      "block text-xs",
                      o.tone === "ghost" ? "text-muted" : "text-bg/80",
                    )}
                  >
                    {o.detail}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 font-mono text-xs text-muted">{me.name} 在決定</p>
          )}
        </div>
      )}

      {(game.phase === "need-roll" || game.phase === "moving" || game.phase === "steal-roll") && (
        <div>
          <p className="text-sm text-muted">
            {game.phase === "moving"
              ? "棋子在走。"
              : game.phase === "steal-roll"
                ? human
                  ? "停在盜錢包。擲兩顆點數骰，合計 12 才能盜。"
                  : `${me.name} 在擲盜錢包。`
                : human
                  ? "擲三顆：兩顆點數骰走路，一顆空投骰。"
                  : `${me.name} 準備擲骰。`}
          </p>
          {human && (game.phase === "need-roll" || game.phase === "steal-roll") ? (
            <button
              type="button"
              onClick={onRoll}
              className="mt-2 h-11 w-full rounded-xl bg-primary font-medium text-bg"
            >
              {game.phase === "steal-roll" ? "擲兩顆" : "擲三顆"}
            </button>
          ) : (
            <p className="mt-3 font-mono text-xs text-primary">
              {game.phase === "moving" ? "移動中" : "對手回合"}
            </p>
          )}
        </div>
      )}

      {game.phase === "over" && <p className="text-sm text-muted">這局已經收盤。</p>}
    </section>
  );
}

function Roster({ game, onSteal }: { game: State; onSteal: (id: string) => void }) {
  const steal =
    game.phase === "need-choice" &&
    TILES[game.players[game.turn].pos].kind === "steal" &&
    game.players[game.turn].human;
  return (
    <div className="grid grid-cols-4 gap-1 lg:grid-cols-2">
      {game.players.map((p, i) => {
        const net = netWorth(game, i);
        const pct = Math.max(0, Math.min(100, (net / WIN) * 100));
        const active = game.turn === i && game.phase !== "over";
        const can = steal && i !== game.turn && !p.bankrupt && p.cash >= 1;
        return (
          <div
            key={p.id}
            className={cx(
              "min-w-0 rounded-xl border bg-surface p-2 text-left",
              active ? "border-primary" : "border-line",
              p.bankrupt && "opacity-50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={cx("inline-block h-3 w-3 rounded-full", `tok-${i}`)} />
                {p.name}
              </span>
              <span className="font-mono text-xs text-muted">
                {p.bankrupt ? "破產" : money(net)}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-bg">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 hidden font-mono text-[11px] text-muted lg:block">
              USDT {money(p.cash)}
              {p.miner ? " · 礦機" : ""}
            </p>
            <p className="hidden truncate text-[11px] text-muted lg:block">
              {COINS.map((c) => (p.bags[c] > 0.0001 ? `${c} ${qty(p.bags[c])}` : null))
                .filter(Boolean)
                .join(" · ") || "沒有持倉"}
            </p>
            <p className="hidden truncate text-[11px] text-muted lg:block">
              {game.nfts
                .filter((n) => n.owner === i)
                .map((n) => `${n.name}${n.level}`)
                .join(" ") || "沒有 NFT 房"}
            </p>
            {can && (
              <button
                type="button"
                onClick={() => onSteal(`steal:${i}`)}
                className="mt-2 h-11 w-full rounded-lg bg-accent text-sm font-medium text-bg"
              >
                盜走 50% USDT
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
