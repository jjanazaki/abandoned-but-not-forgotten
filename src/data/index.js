import raw from './abandoned-equipment.json';

export const meta = raw.meta;
export const tools = [...raw.tools].sort((a, b) => a.dates.launchYear - b.dates.launchYear);

export const getTool = (id) => tools.find((t) => t.id === id);
export const toolsOfBody = (id) => tools.filter((t) => t.body === id);
export const getBody = (id) => raw.bodies.find((b) => b.id === id);

// Only worlds that actually have equipment in the documents are shown in the carousel.
export const bodies = raw.bodies.filter((b) => toolsOfBody(b.id).length > 0);

export function yearRange(bodyId) {
  const list = toolsOfBody(bodyId);
  const from = Math.min(...list.map((t) => t.dates.launchYear));
  const active = list.some((t) => t.dates.endYear == null);
  const to = Math.max(...list.map((t) => t.dates.endYear ?? 0));
  if (active) return `${from} – present`;
  return from === to ? `${from}` : `${from} – ${to}`;
}

export const STATUS_TONE = {
  active: 'good',
  'mission-ended': 'warn',
  'contact-lost': 'muted',
  'left-behind': 'info',
};
