import RpcError from '../../rpc/RpcError';
import CommandSender from '../CommandSender';
import Component from './Component';

export default class PluginGeneratedComponent extends Component {
    constructor(
        name: string,
        methods: Map<
            string,
            (params: any, sender: CommandSender) => Promise<any>
        >
    ) {
        super(name, {
            set_config_methods: false,
            auto_apply_config: false
        });
        // appends methods
        for (const [name, exec] of methods.entries()) {
            console.warn('Nill problem! ', name);
            this.addMethod(name.toLowerCase(), exec);
        }
    }

    override async getConfig(params?: any) {
        if (this.methods.has('getconfig')) {
            return this.call(CommandSender.INTERNAL, 'getconfig');
        }
        return {};
    }

    override async getStatus(params?: any) {
        if (this.methods.has('getstatus')) {
            return this.call(CommandSender.INTERNAL, 'getstatus');
        }
        return {};
    }

    override async setConfig(config: Record<string, any>) {
        if (!this.methods.has('setconfig')) {
            throw RpcError.MethodNotFound();
        }
        return this.call(CommandSender.INTERNAL, 'setconfig', config);
    }

    protected override getDefaultConfig(): Record<string, any> {
        return {};
    }
}
