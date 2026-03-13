import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ImageView from '../views/ImageView.vue';
import LibraryView from '../views/LibraryView.vue';
import LikesView from '../views/LikesView.vue';
import ExploreView from '../views/ExploreView.vue';
import FolderView from '../views/FolderView.vue';
import MomentView from '../views/MomentView.vue';
import { useAppStore } from '../stores/app';
import { pinia } from '../stores/pinia';
import SettingsView from '../views/SettingsView.vue';

function shouldPreserveModalScroll(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  const appStore = useAppStore(pinia);
  const backgroundPath = appStore.imageModalBackgroundPath;

  if (!backgroundPath) {
    return false;
  }

  const isOpeningModal = to.name === 'image' && from.fullPath === backgroundPath;
  const isClosingModal = from.name === 'image' && to.fullPath === backgroundPath;
  const isNavigatingWithinModal = to.name === 'image' && from.name === 'image';

  return isOpeningModal || isClosingModal || isNavigatingWithinModal;
}

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
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (shouldPreserveModalScroll(to, from)) {
      return false;
    }

    return { top: 0 };
  }
});
