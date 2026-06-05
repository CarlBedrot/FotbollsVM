// Country-name → flag emoji for the WC2026 teams (keys are normalised: lowercase, no diacritics).
const FLAGS: Record<string, string> = {
  // Group A
  mexico: '🇲🇽', 'south africa': '🇿🇦', 'south korea': '🇰🇷', 'czech republic': '🇨🇿',
  // Group B
  canada: '🇨🇦', 'bosnia & herzegovina': '🇧🇦', qatar: '🇶🇦', switzerland: '🇨🇭',
  // Group C
  brazil: '🇧🇷', morocco: '🇲🇦', haiti: '🇭🇹', scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  // Group D
  usa: '🇺🇸', paraguay: '🇵🇾', australia: '🇦🇺', turkey: '🇹🇷',
  // Group E
  germany: '🇩🇪', curacao: '🇨🇼', 'ivory coast': '🇨🇮', ecuador: '🇪🇨',
  // Group F
  netherlands: '🇳🇱', japan: '🇯🇵', sweden: '🇸🇪', tunisia: '🇹🇳',
  // Group G
  belgium: '🇧🇪', egypt: '🇪🇬', iran: '🇮🇷', 'new zealand': '🇳🇿',
  // Group H
  spain: '🇪🇸', 'cape verde': '🇨🇻', 'saudi arabia': '🇸🇦', uruguay: '🇺🇾',
  // Group I
  france: '🇫🇷', senegal: '🇸🇳', iraq: '🇮🇶', norway: '🇳🇴',
  // Group J
  argentina: '🇦🇷', algeria: '🇩🇿', austria: '🇦🇹', jordan: '🇯🇴',
  // Group K
  portugal: '🇵🇹', 'dr congo': '🇨🇩', uzbekistan: '🇺🇿', colombia: '🇨🇴',
  // Group L
  england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', croatia: '🇭🇷', ghana: '🇬🇭', panama: '🇵🇦',
};

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Flag emoji for a team name, or '' for placeholders / unknown (e.g. knockout slots like "1A"). */
export function flagFor(name: string): string {
  return FLAGS[norm(name)] ?? '';
}
