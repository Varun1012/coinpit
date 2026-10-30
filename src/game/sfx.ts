let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockSfx() {
  ac();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain: number, when = 0, hp = 800) {
  const c = ac();
  if (!c) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = c.createGain();
  const t0 = c.currentTime + when;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(t0);
}

export function sfxDice() {
  noise(0.08, 0.18, 0, 1200);
  noise(0.07, 0.14, 0.09, 900);
  noise(0.09, 0.16, 0.18, 1400);
  tone(180, 0.06, "triangle", 0.12, 0.28);
  tone(240, 0.07, "triangle", 0.1, 0.36);
}

export function sfxStep() {
  tone(520, 0.045, "square", 0.03);
}

export function sfxPass() {
  tone(523, 0.08, "triangle", 0.08);
  tone(659, 0.1, "triangle", 0.08, 0.08);
  tone(784, 0.14, "triangle", 0.07, 0.16);
}

export function sfxBuy() {
  tone(392, 0.08, "sine", 0.08);
  tone(523, 0.12, "sine", 0.08, 0.07);
}

export function sfxUpgrade() {
  tone(440, 0.07, "triangle", 0.08);
  tone(554, 0.07, "triangle", 0.08, 0.07);
  tone(659, 0.08, "triangle", 0.08, 0.14);
  tone(880, 0.16, "triangle", 0.07, 0.21);
}

export function sfxTax() {
  tone(330, 0.1, "sawtooth", 0.04);
  tone(247, 0.16, "sawtooth", 0.04, 0.1);
}

export function sfxRent() {
  tone(880, 0.05, "square", 0.04);
  tone(1175, 0.08, "square", 0.03, 0.05);
}

export function sfxSteal() {
  tone(196, 0.12, "sawtooth", 0.05);
  tone(294, 0.1, "square", 0.05, 0.12);
  tone(392, 0.16, "square", 0.05, 0.22);
}

export function sfxFail() {
  tone(180, 0.16, "sine", 0.06);
  tone(140, 0.18, "sine", 0.05, 0.12);
}

export function sfxCard() {
  noise(0.05, 0.08, 0, 2000);
}

export function sfxAir() {
  tone(660, 0.06, "sine", 0.06);
  tone(990, 0.1, "sine", 0.05, 0.06);
}

export function sfxBust() {
  tone(110, 0.28, "triangle", 0.08);
}

export function playLog(line: string) {
  if (line.includes("擲出")) sfxDice();
  else if (line.includes("經過起點")) sfxPass();
  else if (line.includes("升到")) sfxUpgrade();
  else if (line.includes("買下")) sfxBuy();
  else if (line.includes("交稅")) sfxTax();
  else if (line.includes("盜走")) sfxSteal();
  else if (line.includes("不是 6") || line.includes("未連中")) sfxFail();
  else if (line.includes("踩中")) sfxRent();
  else if (line.includes("空投")) sfxAir();
  else if (line.includes("破產")) sfxBust();
  else if (line.includes("抽到")) sfxCard();
}
