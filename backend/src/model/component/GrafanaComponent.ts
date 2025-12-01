import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CFG_FOLDER} from '../../config';
import type {Grafana as Params} from '../../validations/params';
import Component from './Component';

export default class GrafanaComponent extends Component<NonNullable<any>> {
    constructor() {
        super('Grafana', {set_config_methods: false, auto_apply_config: false});
    }

    @Component.Expose('GetConfig')
    public override async getConfig() {
        const filePath = join(CFG_FOLDER, 'grafana', 'config.json');
        return JSON.parse(await readFile(filePath, 'utf-8'));
    }

    @Component.Expose('GetDashboard')
    public async getDashboard(params: Params.GetDashboard) {
        const config = await this.getConfig();
        const dashboards = config.dashboards.filter(
            (dash: {status: string}) => dash.status === 'success'
        );
        return dashboards.find(
            (dash: {slug: string}) => dash.slug === params.slug
        );
    }

    protected override getDefaultConfig() {
        return {};
    }
}
