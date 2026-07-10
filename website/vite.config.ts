import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    // relative asset paths so the build works both at a domain root and under
    // a project-pages subpath (e.g. isaac-mason.github.io/packcat/)
    base: './',
    plugins: [],
});
