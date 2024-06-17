<template>
    <EmptyBlock class="space-y-2">
        <p class="text-xl font-semibold pb-2">Logging you in, please wait</p>
        <div class="w-full flex justify-around">
            <Spinner />
        </div>
    </EmptyBlock>
</template>

<script setup lang="ts">
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import Spinner from '@/components/core/Spinner.vue';
import zitadelAuth from '@/helpers/zitadelAuth';
import { useRouter } from 'vue-router/auto';

const router = useRouter();
console.log('zitadel auth started');

if (zitadelAuth == undefined) {
    window.location.href = '/';
} else {
    zitadelAuth.oidcAuth.mgr
        .signinRedirectCallback()
        .then((data) => {
            console.log(`${zitadelAuth!.oidcAuth.authName} Window signin callback success`, data);
            // need to manually redirect for window type
            // goto original secure route or root
            const redirect = data.state ? data.state.to : null;
            if (router) router.replace(redirect || '/');
            else window.location.href = zitadelAuth!.oidcAuth.appUrl;
        })
        .catch((err) => {
            console.error(`${zitadelAuth!.oidcAuth.authName} Window signin callback error`, err);
            if (router) router.replace('/');
            else window.location.href = zitadelAuth!.oidcAuth.appUrl;
        });
}
</script>
