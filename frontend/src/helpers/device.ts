import { shelly_device_t } from '@/types';

export function getLogo(device?: shelly_device_t | undefined) {
    const deviceInfo = device?.info;
    if (deviceInfo == undefined || deviceInfo.model == undefined) {
        return '/shelly_logo_black.jpg';
    }

    const jwt = deviceInfo.jwt;
    if (jwt != null) {
        const svcType = jwt?.xt1?.svc0?.type;
        if (typeof svcType === 'string') {
            return getLogoFromModel(svcType);
        }
    }

    return getLogoFromModel(deviceInfo.model);
}

export function getLogoFromModel(model?: string) {
    if (!model || model === 'S3MX-0A') {
        return '/shelly_logo_black.jpg';
    }

    if (model.charAt(2) == 'S' && model.charAt(3) == 'W' && model.charAt(5) != '0') {
        const temp = model.split('');
        temp[5] = '0';
        model = temp.join('');
    }
    return `/images/devices/${model}.png`;
}

export function getPredefinedImageForEntity(entity?: string) {
    if (!entity) {
        return '/shelly_logo_black.jpg';
    }
    switch (entity) {
        case 'input':
            return 'fas fa-arrow-right';
        case 'temperature':
            return 'fas fa-thermometer-half';
        case 'bthomesensor':
            return 'fas fa-thermometer-half';
        case 'rgb':
        case 'rgbw':
            return 'fas fa-palette';

        case 'cover':
            return 'fas fa-window-maximize';

        case 'em':
        case 'em1':
        case 'pm1':
            return 'fas fa-bolt';
        case 'number':
        case 'text':
        case 'enum':
        case 'bool':
        case 'group':
        case 'button':
            return 'fas fa-vr-cardboard';

        default:
            return 'fas fa-power-off';
    }
}

export function getDeviceName(info?: any, shellyID?: string) {
    return info?.name || info?.jwt?.n || info?.id || shellyID;
}

export function getAppName(info?: any) {
    return info?.jwt?.p || info?.app || 'Shelly Smart Device';
}

export function isDiscovered(shellyID?: string) {
    return shellyID && shellyID.endsWith('.local');
}
