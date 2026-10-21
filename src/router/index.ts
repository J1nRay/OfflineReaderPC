import { createRouter, createWebHashHistory } from 'vue-router';
import { PagePath } from '../core/window';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: PagePath.BOOKSHELF },
    {
      path: PagePath.BOOKSHELF,
      name: 'bookshelf',
      component: () => import('../views/bookshelf/index.vue')
    },
    {
      path: PagePath.DETAIL,
      name: 'detail',
      component: () => import('../views/detail/index.vue')
    },
    {
      path: PagePath.READ,
      name: 'read',
      component: () => import('../views/read/index.vue')
    },
    {
      path: PagePath.HISTORY,
      name: 'history',
      component: () => import('../views/history/index.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/settings/index.vue')
    },
    { path: '/:pathMatch(.*)*', redirect: PagePath.BOOKSHELF }
  ]
});

export default router;
