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

useAppStore(pinia).initializeTheme();
app.mount('#app');
