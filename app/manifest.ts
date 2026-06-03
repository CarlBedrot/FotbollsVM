import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VM-tipset 2026',
    short_name: 'VM-tipset',
    description: 'Kompisgängets VM-tips 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdeecf',
    theme_color: '#e23b3b',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
