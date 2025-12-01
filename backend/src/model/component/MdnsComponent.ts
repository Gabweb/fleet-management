import * as MdnsModule from '../../modules/Mdns';
import Component from './Component';

export interface MdnsComponentConfig {
    enable: boolean;
}

export default class MdnsComponent extends Component<MdnsComponentConfig> {
    constructor() {
        super('mdns');
    }

    override getStatus(params?: any) {
        return {
            running: MdnsModule.started()
        };
    }

    protected override checkConfigKey(key: string, value: any): boolean {
        switch (key) {
            case 'enable':
                return typeof value === 'boolean';
            default:
                return super.checkConfigKey(key, value);
        }
    }

    protected override applyConfigKey(
        key: string,
        value: any,
        config: MdnsComponentConfig
    ): void {
        switch (key) {
            case 'enable':
                if (value && !MdnsModule.started()) {
                    MdnsModule.start();
                } else if (!value && MdnsModule.started()) {
                    MdnsModule.stop();
                }
                break;
            default:
                super.applyConfigKey(key, value, config);
                break;
        }
    }

    protected override getDefaultConfig() {
        return {
            enable: false
        };
    }
}
