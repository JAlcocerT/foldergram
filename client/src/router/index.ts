import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ImageView from '../views/ImageView.vue';
import LibraryView from '../views/LibraryView.vue';
import LikesView from '../views/LikesView.vue';
import ProfileView from '../views/ProfileView.vue';
import SettingsView from '../views/SettingsView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/image/:id',
      name: 'image',
      component: ImageView,
      props: true
    },
    {
      path: '/library',
      name: 'library',
      component: LibraryView
    },
    {
      path: '/likes/posts',
      name: 'likes',
      component: LikesView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    },
    {
      path: '/:slug',
      name: 'profile',
      component: ProfileView,
      props: true
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
