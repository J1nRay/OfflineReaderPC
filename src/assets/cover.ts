/** 默认封面（内联 SVG，避免引入二进制资源） */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2b5fa8"/>
      <stop offset="1" stop-color="#16294a"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#g)"/>
  <rect x="30" y="30" width="240" height="340" rx="16" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="3"/>
  <path d="M150 150c-16-12-40-16-58-16v130c18 0 42 4 58 16 16-12 40-16 58-16V134c-18 0-42 4-58 16z" fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/>
  <path d="M150 150v130" stroke="#ffffff" stroke-width="5"/>
  <text x="150" y="322" font-size="22" fill="#ffffff" text-anchor="middle" font-family="sans-serif" opacity="0.9">OfflineReader</text>
</svg>`;

export const DEFAULT_COVER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
