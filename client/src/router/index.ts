import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ImageView from '../views/ImageView.vue';
import LibraryView from '../views/LibraryView.vue';
import LikesView from '../views/LikesView.vue';
import ExploreView from '../views/ExploreView.vue';
import FolderView from '../views/FolderView.vue';
import MomentView from '../views/MomentView.vue';
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
      path: '/explore',
      name: 'explore',
      component: ExploreView,
      meta: {
        shell: 'explore'
      }
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
      path: '/moments/:id',
      name: 'moment',
      component: MomentView,
      props: true
    },
    {
      path: '/folders/:slug',
      alias: '/:slug',
      name: 'folder',
      component: FolderView,
      props: true
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
