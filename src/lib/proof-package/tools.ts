// The outside tools Mike uses for an evidence package (from Mike, Nov 11, 2026). The builder links to them; it never
// signs in to or reads from them. Bring their results back as attached PDFs or by typing the numbers in.
export const TOOLS = {
  iws: { label: 'Ice & Water Shield calculator (Building Experts Institute)', url: 'https://iwsreport-rkvnqlmq.manus.space/' },
  hailMaps: { label: 'Interactive Hail Maps', url: 'https://maps.interactivehailmaps.com/' },
  lomanco: { label: 'Lomanco vent calculator', url: 'https://lomanco.app/' },
  roofr: { label: 'Roofr (roof measurements)', url: 'https://app.roofr.com/' },
} as const
