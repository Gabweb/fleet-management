import * as jwt from 'jsonwebtoken';
import {getJwtToken} from '.';
import type {SignContent} from './types';

export const REFRESH_TOKEN_OPTIONS: jwt.SignOptions = {
    expiresIn: '1y',
    issuer: 'fleet-management',
    subject: 'refresh_token'
};

export const ACCESS_TOKEN_OPTIONS: jwt.SignOptions = {
    expiresIn: '1d',
    issuer: 'fleet-management',
    subject: 'access_token'
};

export class DefaultSigner {
    public static sign(
        username: string,
        options: jwt.SignOptions = ACCESS_TOKEN_OPTIONS
    ) {
        return jwt.sign(
            {
                username
            },
            getJwtToken(),
            options
        );
    }

    public static verify(token: string, options: jwt.SignOptions) {
        try {
            return jwt.verify(token, getJwtToken(), options) as jwt.JwtPayload;
        } catch (error) {
            return undefined;
        }
    }

    public static refresh(refresh_token: string) {
        try {
            const payload = DefaultSigner.verify(
                refresh_token,
                REFRESH_TOKEN_OPTIONS
            );

            if (!payload) {
                return undefined;
            }

            return DefaultSigner.sign(payload.username, ACCESS_TOKEN_OPTIONS);
        } catch (error) {
            // logger.error('error refreshing token', error);
            return undefined;
        }
    }
}

// Alexa signer

interface AlexaSignContent extends SignContent {
    username: string;
    endpoint: string;
}

export class AlexaTokenSigner {
    static readonly ALEXA_REFRESH_OPTIONS = {
        ...REFRESH_TOKEN_OPTIONS,
        audience: 'alexa'
    } satisfies jwt.SignOptions;

    static readonly ALEXA_ACCESS_OPTIONS = {
        ...ACCESS_TOKEN_OPTIONS,
        audience: 'alexa'
    } satisfies jwt.SignOptions;

    static sign(
        content: AlexaSignContent,
        options = AlexaTokenSigner.ALEXA_ACCESS_OPTIONS
    ) {
        return jwt.sign(content, getJwtToken(), options);
    }

    static verify(token: string) {
        return jwt.verify(token, getJwtToken(), ACCESS_TOKEN_OPTIONS);
    }

    static refresh(token: string) {
        const content = jwt.verify(token, getJwtToken(), REFRESH_TOKEN_OPTIONS);

        if (typeof content === 'string') {
            return undefined;
        }

        if (
            typeof content.username !== 'string' ||
            typeof content.endpoint !== 'string'
        ) {
            return undefined;
        }

        const signContent: AlexaSignContent = {
            endpoint: content.endpoint,
            username: content.username
        };

        return AlexaTokenSigner.sign(
            signContent,
            AlexaTokenSigner.ALEXA_ACCESS_OPTIONS
        );
    }
}
