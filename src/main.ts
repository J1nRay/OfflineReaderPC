import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { Core } from './core';
import { useMessage } from './hooks/message';
import './styles/index.scss';

const bootstrap = async () => {
  try {
    await Core.initIpcRenderer();

    const app = createApp(App);
    app.use(createPinia());
    app.use(router);
    app.mount('#app');

    const errors = await Core.init();
    if (errors) errors.forEach(e => useMessage().error(e.message));
  } catch (e: any) {
    useMessage().error(e?.message || String(e));
  } finally {
    // 移除启动加载动画
    window.postMessage({ payload: 'removeLoading' }, '*');
  }
};

bootstrap();
