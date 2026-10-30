import { useEffect, useRef, useState } from "react";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { createGame, type State, type Style } from "./logic";
import { useFloor } from "./store";

export type NetSpec = { code: string; host: boolean; name: string };

const AI: { name: string; style: Style }[] = [
  { name: "北區", style: "cautious" },
  { name: "做市", style: "mm" },
  { name: "巨鯨", style: "whale" },
];

type Seat = { peerId: string | null; name: string; human: boolean };

type Snap = {
  kind: "snap";
  game: State;
  hostId: string;
  seats: { peerId: string | null }[];
};

type Act = { kind: "act"; act: "roll" | "dismiss" | "pick"; id?: string };

function emptySeats(selfId: string, name: string): Seat[] {
  return [
    { peerId: selfId, name, human: true },
    ...AI.map((a) => ({ peerId: null, name: a.name, human: false })),
  ];
}

export function useOnline(spec: NetSpec | null) {
  const [guestGame, setGuestGame] = useState<State | null>(null);
  const [status, setStatus] = useState("連接房間…");
  const [roster, setRoster] = useState<string[]>(["你", "北區 · AI", "做市 · AI", "巨鯨 · AI"]);
  const [mySeat, setMySeat] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const selfId = useRef("");
  const roomRef = useRef<P2PRoom | null>(null);
  const seatsRef = useRef<Seat[]>([]);
  const hostId = useRef("");
  const guestRef = useRef<State | null>(null);
  if (!selfId.current) selfId.current = `p${Math.random().toString(36).slice(2, 10)}`;

  useEffect(() => {
    if (!spec) return;
    const mine = selfId.current;
    seatsRef.current = emptySeats(mine, spec.name);
    setRoster(seatsRef.current.map((s, i) => (i === 0 ? `${spec.name} · 房主` : `${s.name} · AI`)));
    const p2p = new P2PRoom({
      room: `pit${spec.code}`,
      selfId: mine,
      name: spec.name.slice(0, 24),
      onConnected: () => setStatus(spec.host ? "房間已開。把號碼給朋友，空位由 AI 下。" : "已進房，等房主開局。"),
      onPeersChanged: (peers: PeerInfo[]) => {
        setFailed(peers.filter((p) => p.connectionState === "failed").map((p) => p.name || "對手"));
        if (!spec.host) {
          const up = peers.filter((p) => p.connectionState === "connected").length;
          if (!guestRef.current) setStatus(up ? `已連上 ${up} 人，等房主開局` : "等待連線…");
          return;
        }
        const humans = peers.filter((p) => p.connectionState === "connected");
        const seats = emptySeats(mine, spec.name);
        humans.slice(0, 3).forEach((peer, i) => {
          seats[i + 1] = { peerId: peer.id, name: peer.name || `玩家${i + 2}`, human: true };
        });
        seatsRef.current = seats;
        setRoster(seats.map((s, i) => (s.human ? (i === 0 ? `${s.name} · 房主` : s.name) : `${s.name} · AI`)));
        const g = useFloor.getState().game;
        if (g) {
          patchSeats(g, seats);
          const latest = useFloor.getState().game;
          if (latest) {
            roomRef.current?.send({
              kind: "snap",
              game: latest,
              hostId: mine,
              seats: seats.map((s) => ({ peerId: s.peerId })),
            } satisfies Snap);
          }
        }
      },
      onMessage: (from, data) => {
        const msg = data as { kind?: string; act?: "roll" | "dismiss" | "pick"; id?: string; game?: State; hostId?: string; seats?: { peerId: string | null }[] };
        if (!spec.host && msg.kind === "snap" && msg.game && msg.seats) {
          hostId.current = msg.hostId || "";
          const seat = msg.seats.findIndex((s) => s.peerId === mine);
          setMySeat(seat < 0 ? -1 : seat);
          setGuestGame(msg.game);
          guestRef.current = msg.game;
          setStatus("");
          return;
        }
        if (spec.host && msg.kind === "act" && msg.act) {
          const g = useFloor.getState().game;
          if (!g) return;
          const seat = seatsRef.current.findIndex((s) => s.peerId === from);
          if (seat !== g.turn) return;
          if (msg.act === "roll") useFloor.getState().roll();
          else if (msg.act === "dismiss") useFloor.getState().dismiss();
          else if (msg.act === "pick" && msg.id) useFloor.getState().pick(msg.id);
        }
      },
    });
    roomRef.current = p2p;
    void p2p.join();
    return () => {
      p2p.close();
      roomRef.current = null;
      guestRef.current = null;
    };
    // spec identity is state held by the screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const hostGame = useFloor((s) => s.game);

  useEffect(() => {
    if (!spec?.host || !hostGame) return;
    roomRef.current?.send({
      kind: "snap",
      game: hostGame,
      hostId: selfId.current,
      seats: seatsRef.current.map((s) => ({ peerId: s.peerId })),
    } satisfies Snap);
  }, [spec?.host, hostGame]);

  function begin() {
    if (!spec?.host) return;
    const seats = seatsRef.current.length ? seatsRef.current : emptySeats(selfId.current, spec.name);
    const g = createGame();
    seats.forEach((s, i) => {
      g.players[i].name = s.name;
      g.players[i].human = s.human;
      g.players[i].style = s.human ? "human" : (AI[i - 1]?.style ?? "cautious");
    });
    g.players[0].style = "human";
    useFloor.getState().adopt(g);
  }

  function sendAct(act: Act["act"], id?: string) {
    if (!hostId.current) return;
    roomRef.current?.send({ kind: "act", act, id } satisfies Act, hostId.current);
  }

  return { guestGame, status, roster, mySeat, failed, begin, sendAct };
}

function patchSeats(g: State, seats: Seat[]) {
  let changed = false;
  const next = structuredClone(g) as State;
  seats.forEach((s, i) => {
    const p = next.players[i];
    if (!p) return;
    if (p.human !== s.human || p.name !== s.name) {
      p.human = s.human;
      p.name = s.name;
      p.style = s.human ? "human" : (AI[i - 1]?.style ?? "cautious");
      changed = true;
    }
  });
  if (changed) useFloor.getState().adopt(next);
}
