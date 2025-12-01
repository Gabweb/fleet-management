import {DEV_MODE} from '../../config';
import RpcError from '../../rpc/RpcError';
import Component from './Component';

interface AlexaConfig {
    enable: boolean;
    access_token?: string;
    refresh_token?: string;
    entities?: string[];
}

function isEnableConfig(obj: any) {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.access_token === 'string' &&
        typeof obj.refresh_token === 'string' &&
        Array.isArray(obj.entities) &&
        obj.entities.every((ent: unknown) => typeof ent === 'string')
    );
}

export default class AlexaComponent extends Component<AlexaConfig> {
    constructor() {
        super('Alexa', {set_config_methods: false, auto_apply_config: false});
    }

    @Component.Expose('Disable')
    disable() {
        if (!this.config.enable) {
            throw RpcError.InvalidRequest();
        }
        return {cmd: 'disable'};
    }

    @Component.Expose('Enable')
    @Component.CheckParams((params) => isEnableConfig(params))
    enable(params: Required<AlexaConfig>) {
        if (this.config.enable) {
            throw RpcError.InvalidRequest();
        }
        this.setConfig({...params, enable: true});
        return {cmd: 'enable', params};
    }

    override getConfig(): Partial<AlexaConfig> {
        // Hide Alexa tokens in production
        if (!DEV_MODE) {
            return {};
        }
        return super.getConfig();
    }

    protected override getDefaultConfig(): AlexaConfig {
        return {
            enable: false
        };
    }
}
