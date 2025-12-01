import { createRouter, createWebHistory } from 'vue-router/auto';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
    history: createWebHistory(import.meta.env.PROD ? '#' : import.meta.env.BASE_URL),
});

router.beforeEach((to, from, next) => {
    // allow zitadel auth to pass
    if (to.path.startsWith('/auth/signinwin')) {
        next();
        return;
    }

    const authStore = useAuthStore();
    if (authStore.loggedIn) {
        if (to.path === '/login') {
            next('/');
            return;
        } else if (to.path == '/') {
            next('/dash/1');
        }
    } else {
        if (to.path === '/login') {
            next();
        } else {
            next('/login');
        }
        return;
    }

    next();
});

export default router;
