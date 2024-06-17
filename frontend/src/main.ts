import { createApp } from 'vue';
import './style.css';
import '@/constants';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { USE_LOGIN_ZITADEL } from './constants';
import zitadelAuth from '@/helpers/zitadelAuth';

function init() {
    const pinia = createPinia();

    const app = createApp(App);
    app.config.performance = true;
    app.use(pinia);
    app.use(router);
    app.mount('#app');

    // Custom directive (v-lazyload) for loading images
    app.directive('lazyload', (el) => {
        // Grab the data-url property
        const imageURL = el.dataset.url;

        // If Intersection Observer is supported
        if ('IntersectionObserver' in window) {
            // Create New Intersection Observer Instance
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    // Logic for each entry passed to the callback function
                    if (entry.isIntersecting) {
                        el.src = imageURL;
                    }
                });
            });

            observer.observe(el);
        } else {
            // Logic if Intersection Observer is not supported
            el.src = imageURL;
        }
    });
}

if (USE_LOGIN_ZITADEL && zitadelAuth) {
    console.debug('using zitadel login strategy');
    zitadelAuth.oidcAuth.startup().then((ok) => {
        if (ok) {
            console.debug('Zitadel started OK');
            init();
        } else {
            console.error('Startup was not ok');
        }
    });
} else init();
