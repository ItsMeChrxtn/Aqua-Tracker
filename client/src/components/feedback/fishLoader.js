// Loading animation: a fish leaping out of the water in an arc and diving
// back in, with a splash where it enters and leaves. Exported as an HTML
// string because it is rendered inside SweetAlert2. Styles live in index.css
// under "Jumping fish loader".
export const fishLoaderHtml = `
<div class="fish-loader" aria-hidden="true">
  <div class="fish-loader__sky">
    <div class="fish-loader__fish">
      <svg viewBox="0 0 48 28" width="46" height="27">
        <defs>
          <linearGradient id="fishBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3f938d" />
            <stop offset="100%" stop-color="#165a5a" />
          </linearGradient>
        </defs>
        <path d="M12 14 L1 4 Q4 14 1 24 Z" fill="#1c6e6e" />
        <path d="M22 5 Q27 0 32 5 Z" fill="#1c6e6e" />
        <ellipse cx="27" cy="14" rx="18" ry="9.5" fill="url(#fishBody)" />
        <path d="M13 16 Q27 25 43 16 Q35 22 27 22.5 Q19 22 13 16 Z" fill="#cde7e5" opacity="0.8" />
        <path d="M24 15 Q28 20 24 22" stroke="#9ecfcb" stroke-width="1.4" fill="none" stroke-linecap="round" />
        <circle cx="37" cy="11.5" r="2.6" fill="#fff" />
        <circle cx="37.8" cy="11.5" r="1.3" fill="#0f3131" />
      </svg>
    </div>
  </div>
  <span class="fish-loader__splash fish-loader__splash--in"></span>
  <span class="fish-loader__splash fish-loader__splash--out"></span>
  <span class="fish-loader__drop fish-loader__drop--1"></span>
  <span class="fish-loader__drop fish-loader__drop--2"></span>
  <span class="fish-loader__drop fish-loader__drop--3"></span>
  <div class="fish-loader__water">
    <svg viewBox="0 0 320 40" preserveAspectRatio="none">
      <path d="M0 8 Q20 2 40 8 T80 8 T120 8 T160 8 T200 8 T240 8 T280 8 T320 8 V40 H0 Z" fill="#6cb2ac" opacity="0.45" />
      <path d="M0 12 Q20 6 40 12 T80 12 T120 12 T160 12 T200 12 T240 12 T280 12 T320 12 V40 H0 Z" fill="#3f938d" opacity="0.55" />
    </svg>
  </div>
</div>`;
