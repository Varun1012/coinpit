/**
 * Room signaling for static hosting (GitHub Pages has no /api/rtc).
 * Peers rendezvous on a public MQTT WebSocket broker, then WebRTC takes over.
 */
import type { PeerRow, RtcPollResponse, SignalKind } from "./p2p";

const BROKERS = ["wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt"];

type Sig = { id: number; from: string; kind: SignalKind; payload: unknown };

export class MqttRelay {
  private ws: WebSocket | null = null;
  private buf = new Uint8Array(0);
  private readonly peers = new Map<string, { name: string; seen: number }>();
  private readonly inbox: Sig[] = [];
  private nextId = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private urlIndex = 0;
  private readonly room: string;
  private readonly selfId: string;
  private readonly name: string;

  constructor(room: string, selfId: string, name: string) {
    this.room = room;
    this.selfId = selfId;
    this.name = name;
  }

  start(): Promise<void> {
    const urls = [BROKERS[this.urlIndex % BROKERS.length], BROKERS[(this.urlIndex + 1) % BROKERS.length]];
    return new Promise((resolve, reject) => {
      const tryUrl = (i: number) => {
        if (this.closed) return;
        if (i >= urls.length) {
          reject(new Error("mqtt relay failed"));
          return;
        }
        let settled = false;
        const ws = new WebSocket(urls[i], ["mqtt"]);
        this.ws = ws;
        ws.binaryType = "arraybuffer";
        const timeout = setTimeout(() => fail(new Error("mqtt timeout")), 6000);
        const fail = (err: unknown) => {
          if (settled || this.closed) return;
          settled = true;
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          void err;
          tryUrl(i + 1);
        };
        ws.onerror = () => fail(new Error("mqtt socket error"));
        ws.onclose = () => {
          if (!settled) fail(new Error("mqtt closed"));
        };
        ws.onmessage = (ev) => {
          this.push(new Uint8Array(ev.data as ArrayBuffer));
        };
        this.onConnack = () => {
          if (settled || this.closed) return;
          settled = true;
          clearTimeout(timeout);
          this.subscribe();
          this.publishPresence();
          this.timer = setInterval(() => this.publishPresence(), 5000);
          resolve();
        };
        ws.onopen = () => {
          ws.send(packet(0x10, connectBody(`cnp${this.selfId}${Math.random().toString(36).slice(2, 6)}`)));
        };
      };
      tryUrl(0);
    });
  }

  private onConnack: () => void = () => {};

  take(since: number): RtcPollResponse {
    const now = Date.now();
    const peers: PeerRow[] = [];
    for (const [id, peer] of this.peers) {
      if (now - peer.seen > 18000) this.peers.delete(id);
      else peers.push({ id, name: peer.name });
    }
    const signals = this.inbox.filter((s) => s.id > since);
    for (const sig of signals) {
      if (!peers.some((p) => p.id === sig.from)) peers.push({ id: sig.from, name: "對手" });
    }
    if (this.inbox.length > 300) this.inbox.splice(0, this.inbox.length - 200);
    return { peers, signals };
  }

  publish(to: string, kind: SignalKind, payload: unknown): void {
    const topic = `cnpit/${this.room}/s/${to}`;
    const body = JSON.stringify({ from: this.selfId, kind, payload });
    this.sendPublish(topic, body, false);
  }

  close(): void {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    try {
      this.sendPublish(`cnpit/${this.room}/p/${this.selfId}`, JSON.stringify({ bye: 1 }), true);
      this.ws?.close();
    } catch {
      /* already gone */
    }
    this.ws = null;
  }

  private subscribe(): void {
    const topics = [`cnpit/${this.room}/p/+`, `cnpit/${this.room}/s/${this.selfId}`];
    const parts: Uint8Array[] = [u16(1)];
    for (const topic of topics) parts.push(encStr(topic), new Uint8Array([0]));
    this.ws?.send(packet(0x82, concat(parts)));
  }

  private publishPresence(): void {
    this.sendPublish(
      `cnpit/${this.room}/p/${this.selfId}`,
      JSON.stringify({ n: this.name.slice(0, 24), t: Date.now() }),
      true,
    );
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(new Uint8Array([0xc0, 0x00]));
  }

  private sendPublish(topic: string, text: string, retain: boolean): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const payload = new TextEncoder().encode(text);
    this.ws.send(packet(retain ? 0x31 : 0x30, concat([encStr(topic), payload])));
  }

  private push(chunk: Uint8Array): void {
    const next = new Uint8Array(this.buf.length + chunk.length);
    next.set(this.buf);
    next.set(chunk, this.buf.length);
    this.buf = next;
    this.drain();
  }

  private drain(): void {
    for (;;) {
      if (this.buf.length < 2) return;
      const rem = readRem(this.buf, 1);
      if (!rem) return;
      const total = 1 + rem.bytes + rem.value;
      if (this.buf.length < total) return;
      const body = this.buf.slice(1 + rem.bytes, total);
      const type = this.buf[0] >> 4;
      this.buf = this.buf.slice(total);
      if (type === 2) this.onConnack();
      else if (type === 3) this.onPublish(body);
    }
  }

  private onPublish(body: Uint8Array): void {
    if (body.length < 2) return;
    const len = (body[0] << 8) | body[1];
    const topic = new TextDecoder().decode(body.slice(2, 2 + len));
    const text = new TextDecoder().decode(body.slice(2 + len));
    let data: { n?: string; bye?: number; from?: string; kind?: SignalKind; payload?: unknown } = {};
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return;
    }
    if (topic.includes("/p/")) {
      const id = topic.slice(topic.lastIndexOf("/") + 1);
      if (id === this.selfId) return;
      if (data.bye) this.peers.delete(id);
      else this.peers.set(id, { name: data.n || "對手", seen: Date.now() });
      return;
    }
    if (!data.from || !data.kind || data.from === this.selfId) return;
    this.inbox.push({ id: this.nextId++, from: data.from, kind: data.kind, payload: data.payload });
  }
}

function connectBody(clientId: string): Uint8Array {
  return concat([encStr("MQTT"), new Uint8Array([4, 0x02, 0x00, 30]), encStr(clientId)]);
}

function encStr(s: string): Uint8Array {
  const b = new TextEncoder().encode(s);
  const out = new Uint8Array(2 + b.length);
  out[0] = b.length >> 8;
  out[1] = b.length & 0xff;
  out.set(b, 2);
  return out;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function packet(typeByte: number, body: Uint8Array): Uint8Array {
  return concat([new Uint8Array([typeByte, ...remBytes(body.length)]), body]);
}

function remBytes(n: number): number[] {
  const out: number[] = [];
  do {
    let d = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) d |= 0x80;
    out.push(d);
  } while (n > 0);
  return out;
}

function readRem(buf: Uint8Array, offset: number): { value: number; bytes: number } | null {
  let value = 0;
  let mul = 1;
  let bytes = 0;
  for (;;) {
    if (offset + bytes >= buf.length) return null;
    const d = buf[offset + bytes];
    bytes += 1;
    value += (d & 0x7f) * mul;
    if ((d & 0x80) === 0) return { value, bytes };
    mul *= 128;
    if (bytes > 4) return null;
  }
}
