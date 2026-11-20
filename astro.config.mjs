import { defineConfig } from 'astro/config';
import { existsSync, realpathSync } from 'node:fs';
import sitemap from '@astrojs/sitemap';

// A legacy updater may still be running during the first protected deployment.
if (process.argv.includes('build') && realpathSync('.') === '/var/www/gasanovdoc' && existsSync('dist')) {
  throw new Error('Для действующего сайта используйте deploy/update.sh');
}

export default defineConfig({
  site: 'https://gasanovdoc.ru',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
