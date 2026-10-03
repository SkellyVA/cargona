import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    const csrf = document.cookie.split(';').map(item => item.trim()).find(item => item.startsWith('cargona_csrf='))?.slice('cargona_csrf='.length);
    if (csrf) headers.set('x-cargona-csrf', csrf);
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (/\/app\/?$/.test(window.location.pathname) && initData) headers.set('x-telegram-init-data', initData);
    return originalFetch(input, { ...init, headers });
  }
  return originalFetch(input, init);
};

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// Register Service Worker for PWA Standalone Mode
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((err) => {
      console.log('SW registration skipped:', err);
    });
  });
}
