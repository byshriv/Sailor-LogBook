// Original v8 achievement geometry; only the seven ACH identities.
const art = (b: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240"><rect width="120" height="120" rx="28" fill="#16293a"/>${b}</svg>`,
  wv = (y: number, c: string) => `<path d="M0 ${y}q15-10 30 0t30 0t30 0t30 0V120H0z" fill="${c}"/>`,
  boat = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 0h44l-8 10h-28z" fill="#F7F5E4"/><path d="M0-34v32M0-32l18 26h-18M-2-26l-14 20h14" fill="#5b9bd5" stroke="#F7F5E4" stroke-width="2" stroke-linejoin="round"/></g>`,
  rot = (n: number, f: string) =>
    [...Array(n)].map((_, i) => `<g transform="rotate(${(i * 360) / n} 60 60)">${f}</g>`).join('');
export const achievementArt: Record<string, () => string> = {
  'Maiden Voyage': () =>
    art(
      `<circle cx="88" cy="34" r="11" fill="#d8b94c"/>${wv(88, '#226192')}${boat(54, 80, 1)}${wv(100, '#1b4b72')}`,
    ),
  'Bright Spot': () =>
    art(
      `<circle cx="60" cy="60" r="17" fill="#d8b94c"/>${rot(12, '<line x1="60" y1="22" x2="60" y2="34" stroke="#d8b94c" stroke-width="4" stroke-linecap="round"/>')}`,
    ),
  'Message Sent': () =>
    art(
      `<g transform="translate(60 54) rotate(-28) scale(1.7)"><rect x="-3" y="-24" width="6" height="6" rx="1" fill="#a67c5b"/><path d="M-3-18h6v6c4 2 6 5 6 9v14a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3v-14c0-4 2-7 6-9z" fill="#F7F5E4" fill-opacity=".92"/><rect x="-4" y="-2" width="8" height="10" rx="1" fill="#cfc8a8"/></g>${wv(92, '#226192')}${wv(104, '#1b4b72')}`,
    ),
  'Fair Winds': () =>
    art(
      `<path d="M12 36q22-10 44 0t40 0M20 52q18-8 36 0t34 0" fill="none" stroke="#F7F5E4" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>${boat(62, 82, 1.05)}${wv(98, '#226192')}`,
    ),
  'Open Sea': () =>
    art(
      `<circle cx="60" cy="70" r="24" fill="#d8b94c"/>${wv(70, '#226192')}${wv(84, '#1b4b72')}${wv(98, '#16384f')}${boat(86, 70, 0.4)}`,
    ),
  'Four Bells': () =>
    art(
      `<path d="M60 20c-14 0-22 10-22 26v14l-8 12h60l-8-12V46c0-16-8-26-22-26z" fill="#d8b94c"/><circle cx="60" cy="80" r="6" fill="#a67c5b"/><path d="M60 12v8M36 98v10M50 98v10M64 98v10M78 98v10" stroke="#F7F5E4" stroke-width="3.5" stroke-linecap="round"/>`,
    ),
  'Seasoned Sailor': () =>
    art(
      `<circle cx="60" cy="60" r="24" fill="none" stroke="#d8b94c" stroke-width="7"/><circle cx="60" cy="60" r="8" fill="#d8b94c"/>${rot(8, '<line x1="60" y1="36" x2="60" y2="14" stroke="#d8b94c" stroke-width="5" stroke-linecap="round"/>')}`,
    ),
};
