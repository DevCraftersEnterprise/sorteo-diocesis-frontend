import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/HomeView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../pages/AdminView.vue'),
    },
    {
      path: '/admin/unpaid',
      name: 'admin-unpaid',
      component: () => import('../pages/UnpaidView.vue'),
    },
  ],
});

export default router;
