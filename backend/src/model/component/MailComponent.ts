import Component from './Component';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mailer from 'nodemailer/lib/mailer';
import { ERROR_CODES } from '../../tools/jsonrpc';

type MailOptions = Parameters<InstanceType<typeof Mailer>['sendMail']>[0];
type CreateTransport = ReturnType<typeof nodemailer.createTransport>;

export interface MailComponentConfig {
    enable: boolean;
}

export default class MailComponent extends Component<MailComponentConfig> {
    #transport?: CreateTransport;
    #verifyResponse: boolean | null;
    #verifyTs: number;
    #verifyError: Error | null;

    declare config: {
        enable: boolean;
        transport?: SMTPTransport.Options;
    };

    constructor() {
        super('mail');
        this.methods.set('send', (params) => this.#sendMail(params));
        this.#verifyResponse = null;
        this.#verifyTs = 0;
        this.#verifyError = null;
    }

    async #sendMail(params: MailOptions) {
        if (!this.config.enable) {
            return Promise.reject({ error_code: ERROR_CODES.METHOD_NOT_FOUND });
        }
        if (!this.#transport) {
            return Promise.reject({ error: 'transport not set up' });
        }

        const info = await this.#transport.sendMail(params);
        return info;
    }

    override getStatus() {
        return {
            verify: this.#verifyResponse,
            verifyTs: this.#verifyTs,
            verifyError: this.#verifyError,
        };
    }

    protected override configChanged() {
        if (this.config.transport) {
            this.#transport = nodemailer.createTransport(this.config.transport);
            this.#transport.verify((error) => {
                this.#verifyTs = Date.now();
                if (error) {
                    this.#verifyError = error;
                    this.#verifyResponse = false;
                    return;
                }
                this.#verifyError = null;
                this.#verifyResponse = true;
            });
        }
    }

    public override checkParams(method: string, params?: any) {
        switch (method) {
            case 'send':
                return (
                    params &&
                    typeof params === 'object' &&
                    typeof params.from === 'string' &&
                    typeof params.to === 'string' &&
                    typeof params.subject === 'string' &&
                    typeof params.text === 'string' &&
                    typeof params.html === 'string'
                );
            default:
                return super.checkParams(method, params);
        }
    }

    protected override checkConfigKey(key: string, value: any) {
        switch (key) {
            case 'enable':
                return typeof value === 'boolean';

            case 'transport':
                return value && typeof value === 'object';
            default:
                return super.checkConfigKey(key, value);
        }
    }

    protected override getDefaultConfig() {
        return { enable: false };
    }
}
