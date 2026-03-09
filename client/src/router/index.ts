import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ImageView from '../views/ImageView.vue';
import LikesView from '../views/LikesView.vue';
import ProfileView from '../views/ProfileView.vue';

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
      path: '/likes/posts',
      name: 'likes',
      component: LikesView
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
