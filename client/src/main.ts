import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { router } from './router';
import { useAppStore } from './stores/app';
import './styles/base.css';
import 'virtual:uno.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const appStore = useAppStore(pinia);

appStore.initializeTheme();
appStore.initializeLastOpenedFolder();

router.afterEach((to) => {
  if (to.name !== 'folder' || typeof to.params.slug !== 'string') {
    return;
  }

  appStore.recordOpenedFolder(to.params.slug);
});

app.mount('#app');
