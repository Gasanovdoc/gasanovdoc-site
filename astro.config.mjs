import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gasanovdoc.ru',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
