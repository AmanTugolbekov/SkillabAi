/** Кружок с инициалами вместо эмодзи-аватара. Цвет выводится из имени,
 *  поэтому у одного человека он всегда одинаковый. */
const TINTS = [
  { bg: '#e23a1f', fg: '#ffffff' },
  { bg: '#1f6fb2', fg: '#ffffff' },
  { bg: '#12795f', fg: '#ffffff' },
  { bg: '#8a4bbd', fg: '#ffffff' },
  { bg: '#b8690a', fg: '#ffffff' },
  { bg: '#43505e', fg: '#ffffff' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function tintFor(name: string) {
  let sum = 0;
  for (const char of name) sum += char.codePointAt(0) ?? 0;
  return TINTS[sum % TINTS.length];
}

export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const tint = tintFor(name);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold leading-none"
      style={{
        width: size,
        height: size,
        background: tint.bg,
        color: tint.fg,
        fontSize: Math.round(size * 0.38),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
