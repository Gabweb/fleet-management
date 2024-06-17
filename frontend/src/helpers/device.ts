import { shelly_device_t } from '@/types';

export function getLogo(device?: shelly_device_t | undefined) {
    const deviceInfo = device?.info;
    if (deviceInfo == undefined || deviceInfo.model == undefined) {
        return '/shelly_logo_black.jpg';
    }

    return getLogoFromModel(deviceInfo.model);
}

export function getLogoFromModel(model?: string) {
    if (!model) {
        return '/shelly_logo_black.jpg';
    }

    if (model.charAt(2) == 'S' && model.charAt(3) == 'W' && model.charAt(5) != '0') {
        const temp = model.split('');
        temp[5] = '0';
        model = temp.join('');
    }
    return `https://control.shelly.cloud/images/device_images/${model}.png`;
}

export function getDeviceName(info?: any, shellyID?: string) {
    return info?.name || info?.id || shellyID;
}

export function getAppName(info?: any) {
    return info?.app || 'Shelly Smart Device';
}

export function isDiscovered(shellyID?: string) {
    return shellyID && shellyID.endsWith('.local');
}
