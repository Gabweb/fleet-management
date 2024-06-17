import express from 'express';
import https from 'https';
import log4js from 'log4js';
import cors from 'cors';
import passport from 'passport';
import RED from 'node-red';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import { ZitadelIntrospectionStrategy } from 'passport-zitadel';
import auth from './routes/auth';
import api from './routes/api';
import * as User from '../model/User';
import * as Commander from '../modules/Commander';
import { WebComponentConfig } from '../model/component/WebComponent';
import * as jsonrpc from '../tools/jsonrpc';
import { configRc, loginStrategy } from '../config';
import { NODE_RED_SETTINGS, setup as setupNodeRed } from '../config/node-red';
import WebsocketController from '../controller/ws/WebsocketController';
import ShellyWebsocketHandler from '../controller/ws/handlers/ShellyWebsocketHandler';
import ClientWebsocketHandler from '../controller/ws/handlers/ClientWebsocketHandler';
import MessageHandler from '../controller/ws/MessageHandler';
import LocalWebsocketHandler from '../controller/ws/handlers/LocalWebsocketHandler';

const logger = log4js.getLogger('web');

// Middleware helper

function isLoggedIn(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    if (req.token === undefined) {
        res.status(401).end();
        return;
    }

    if (req.user === undefined) {
        res.status(403).end();
        return;
    }

    next();
}

function registerMiddleware(app: express.Express) {
    app.use([
        log4js.connectLogger(logger, {
            level: 'auto',
            format: ':status :method :url',
            nolog: '/health',
        }),
        express.json(),
        cookieParser(),
        cors(),
    ]);
    // assign token in req object
    app.use(async (req, res, next) => {
        let token: string = '';
        if (typeof req.headers.authorization === 'string') {
            // Look at Request Headers
            token = req.headers.authorization.split(' ').at(-1)!;
        } else if (typeof req.query.token === 'string') {
            // Look for Query Params
            token = req.query.token;
        } else if (req.cookies.token) {
            // Look in Cookies
            token = req.cookies.token;
        }

        if (token.length > 1) {
            req.token = token;
            const user = await User.getUserFromToken(token);
            if (user) {
                req.user = user;
            }
        } else if (User.allowDebug) {
            req.token = '';
            req.user = User.DEBUG_USER;
        }

        next();
    });
}

function registerRpcHandlers(app: express.Express) {
    app.get<{ method: string }>('/rpc/:method', isLoggedIn, async (req, res) => {
        const { method } = req.params;
        const params = req.query;
        const user = req.user!;
        try {
            logger.debug(
                `Received ${method} with ${JSON.stringify(params || {})} from ${user.username}:${user.group}`
            );
            const resp = await Commander.exec(user, method, params);
            res.status(200).json(resp).end();
        } catch (err: any) {
            const error_code = err.error_code || jsonrpc.ERROR_CODES.SERVER_ERROR;
            res.status(400)
                .json(jsonrpc.buildOutgoingJsonRpcError(error_code, null))
                .end();
        }
    });

    app.post<{ method: string }>('/rpc/:method', isLoggedIn, async (req, res) => {
        const { method } = req.params;
        const params = req.body;
        const user = req.user!;
        try {
            const resp = await Commander.exec(user, method, params);
            res.status(200).json(resp).end();
        } catch (err: any) {
            const error_code = err.error_code || jsonrpc.ERROR_CODES.SERVER_ERROR;
            res.status(400)
                .json(jsonrpc.buildOutgoingJsonRpcError(error_code, null))
                .end();
        }
    });
}

function registerRouters(app: express.Express) {
    app.get('/health', (req, res) => {
        res.json({
            online: true,
        });
    });

    app.use('/auth', auth);
    app.use('/api', api);
}

function registerZitadelIfNeeded(app: express.Express) {
    if (loginStrategy === 'zitadel-introspection') {
        logger.debug('applying zitadel login strategy');
        passport.use(new ZitadelIntrospectionStrategy(configRc.oidc!.backend));
        app.use(passport.initialize());
    }
}

function registerFrontEnd(app: express.Express) {
    const clientPath = path.join(
        __dirname,
        configRc.components!.web!.relativeClientPath
    );
    app.use('/', express.static(clientPath));
    logger.info('frontend static path %s', clientPath);
}

export async function start() {
    const app = express();

    registerMiddleware(app);
    registerRouters(app);
    registerRpcHandlers(app);
    registerZitadelIfNeeded(app);
    registerFrontEnd(app);

    // load web config
    const config: Required<WebComponentConfig> =
        await Commander.execInternal('Web.GetConfig');

    // setup node red
    setupNodeRed(config);

    // register web controllers
    const messageHandler = new MessageHandler();

    const shellyHandler = new ShellyWebsocketHandler();
    const clientHandler = new ClientWebsocketHandler(messageHandler);
    const localHandler = new LocalWebsocketHandler(messageHandler);

    let wsController: WebsocketController;
    let wssController: WebsocketController;

    // start webservers

    // start unsecure
    if (config.port > -1) {
        const serverHttp = app.listen(config.port, () => {
            logger.info('web started on port:[%i]', config.port);
        });

        RED.init(serverHttp, NODE_RED_SETTINGS);
        serverHttp.setTimeout(10000);

        wsController = new WebsocketController(
            serverHttp,
            shellyHandler,
            clientHandler
        );
    }

    // start secure
    if (config.port_ssl > -1) {
        const httpsOptions = {
            key: config.https_key,
            cert: config.https_crt,
        };
        const serverHttps = https
            .createServer(httpsOptions, app)
            .listen(config.port_ssl, () => {
                logger.info('secure web started on port:[%i]', config.port_ssl);
            });

        RED.init(serverHttps, NODE_RED_SETTINGS);
        serverHttps.setTimeout(10000);
        wssController = new WebsocketController(
            serverHttps,
            shellyHandler,
            clientHandler
        );
    }

    // start node red
    app.use(NODE_RED_SETTINGS.httpNodeRoot, isLoggedIn, RED.httpNode);
    app.use(NODE_RED_SETTINGS.httpAdminRoot, isLoggedIn, RED.httpAdmin);
    RED.start();
}
