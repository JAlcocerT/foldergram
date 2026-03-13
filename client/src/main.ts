import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { useAppStore } from './stores/app';
import { pinia } from './stores/pinia';
import './styles/base.css';
import 'virtual:uno.css';

const app = createApp(App);

app.use(pinia);
app.use(router);

const appStore = useAppStore(pinia);

appStore.initializeTheme();
appStore.initializeLastOpenedFolder();

router.afterEach((to) => {
  if (to.name === 'folder' && typeof to.params.slug === 'string') {
    appStore.recordOpenedFolder(to.params.slug);
  }
});

app.mount('#app');
