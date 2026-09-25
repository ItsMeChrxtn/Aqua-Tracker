// Validated categorical palette (dataviz skill, light mode) — fixed order,
// never cycled/reassigned per render. Slots 3/4/5 sit below 3:1 contrast on
// white, so charts using them must carry direct labels/legend (never color alone).
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

export const SEQUENTIAL_BLUE = '#2a78d6';

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const CHART_INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
};

export function seriesColor(index) {
  return CATEGORICAL[index % CATEGORICAL.length];
}
