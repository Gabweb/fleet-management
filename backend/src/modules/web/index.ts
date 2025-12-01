import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import https from 'node:https';
import * as path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import log4js from 'log4js';
import multer from 'multer';
import RED from 'node-red';
import passport from 'passport';
import {ZitadelIntrospectionStrategy} from 'passport-zitadel';
import sharp from 'sharp';
import {configRc, loginStrategy} from '../../config';
import {NODE_RED_SETTINGS, setup as setupNodeRed} from '../../config/node-red';
import type {WebComponentConfig} from '../../model/component/WebComponent';
import * as Commander from '../../modules/Commander';
import RpcError from '../../rpc/RpcError';
import type {JsonRpcIncomming} from '../../rpc/types';
import type {Sendable, user_t} from '../../types';
import {
    DEBUG_USER,
    UNAUTHORIZED_USER,
    getUserFromToken,
    hasAllowedDebug
} from '../user';
// import auth from './routes/auth';
// import api from './routes/api';
import grafana from './routes/grafana';
import MessageHandler from './ws/MessageHandler';
import WebsocketController from './ws/WebsocketController';
import ClientWebsocketHandler from './ws/handlers/ClientWebsocketHandler';
import LocalWebsocketHandler from './ws/handlers/LocalWebsocketHandler';
import ShellyWebsocketHandler from './ws/handlers/ShellyWebsocketHandler';

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

function isNotDefaultUser(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    if (req.user && req.user.username === UNAUTHORIZED_USER.username) {
        res.status(403).end();
        return;
    }
    next();
}

function registerMiddleware(app: express.Express) {
    app.use((req, res, next) => {
        // Website you wish to allow to connect
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

        // Request methods you wish to allow
        res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, OPTIONS, PUT, PATCH, DELETE'
        );

        // Request headers you wish to allow
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-Requested-With,content-type'
        );

        // Pass to next layer of middleware
        next();
    });
    app.use(cors());
    app.use([
        log4js.connectLogger(logger, {
            level: 'auto',
            format: ':status :method :url',
            nolog: '/health'
        }),
        express.json(),
        cookieParser()
    ]);
    // assign token in req object
    app.use(async (req, res, next) => {
        let token = '';
        if (typeof req.headers.authorization === 'string') {
            // Look at Request Headers
            const authHeader = req.headers.authorization;
            if (authHeader.includes(' ')) {
                token = authHeader.split(' ').at(-1)!;
            }
        } else if (typeof req.query.token === 'string') {
            // Look for Query Params
            token = req.query.token;
        } else if (req.cookies.token) {
            // Look in Cookies
            token = req.cookies.token;
        }

        if (token.length > 1) {
            req.token = token;
            const user = await getUserFromToken(token);
            req.user = user ?? UNAUTHORIZED_USER;
        } else if (hasAllowedDebug()) {
            req.token = '';
            req.user = DEBUG_USER;
        } else {
            req.token = '';
            req.user = UNAUTHORIZED_USER;
        }
        next();
    });
}

const messageHandler = new MessageHandler();

async function handleWebRpc(
    res: express.Response,
    user: user_t,
    method: string,
    params: any
) {
    const sendable: Sendable = {
        send(data) {
            const parsed = JSON.parse(data);
            res.json(parsed?.result || parsed).end();
        }
    };

    // bad type casting
    const msg: JsonRpcIncomming = {
        id: null as any,
        src: undefined as any,
        method,
        params
    };
    messageHandler.handleInternalCommands(sendable, msg, user);
}

function registerRpcHandlers(app: express.Express) {
    app.get('/rpc/:method', (req, res) => {
        handleWebRpc(res, req.user!, req.params.method, req.query);
    });
    app.post('/rpc/:method', (req, res) => {
        handleWebRpc(res, req.user!, req.params.method, req.body);
    });
    app.post('/rpc', (req, res) => {
        const {method, params} = req.body;
        if (typeof method !== 'string') {
            res.status(400).json(RpcError.InvalidRequest().getRpcError());
            return;
        }
        handleWebRpc(res, req.user!, method, params);
    });
}

function registerRouters(app: express.Express) {
    app.get('/health', (req, res) => {
        res.json({
            online: true
        });
    });

    // app.use('/auth', auth);
    // app.use('/api', api);
    if (configRc.graphs?.grafana) {
        app.use('/grafana', grafana);
    }

    // #region Image Upload TEST

    const upload = multer({dest: 'uploads/'}); // Temporary storage for uploads
    const backgroundsPath = path.join(
        __dirname,
        '../../../uploads/backgrounds'
    );
    const profilePicturesPath = path.join(
        __dirname,
        '../../../uploads/profilePics'
    );
    const reportImagesPath = path.join(
        __dirname,
        '../../../uploads/reportImages'
    );

    if (!fs.existsSync(reportImagesPath)) {
        fs.mkdirSync(reportImagesPath, {recursive: true});
    }

    const emReportsPath = path.join(__dirname, '../../../uploads/reports');
    if (!fs.existsSync(emReportsPath))
        fs.mkdirSync(emReportsPath, {recursive: true});

    app.use('/uploads/reportImages', express.static(reportImagesPath));
    app.use('/uploads/backgrounds', express.static(backgroundsPath));
    app.use('/uploads/profilePics', express.static(profilePicturesPath));

    app.get('/api/reports/download/:filename', isLoggedIn, (req, res) => {
        const {filename} = req.params;
        if (!/^[a-zA-Z0-9\-_\.]+\.csv$/.test(filename)) {
            res.status(400).send('Invalid filename');
            return;
        }
        const fullPath = path.join(emReportsPath, filename);
        fs.access(fullPath, fs.constants.R_OK, (err) => {
            if (err) {
                res.status(404).send('File not found');
                return;
            }
            res.download(fullPath, filename);
        });
    });

    app.get('/media/getAllBackgrounds', (req, res) => {
        fs.readdir(backgroundsPath, (err, files) => {
            if (err)
                return res
                    .status(500)
                    .json({error: 'Failed to read directory'});

            const thumbnails = files.filter((file) => file.includes('_thumb'));
            const originals = files.filter((file) => !file.includes('_thumb'));

            return res.json({thumbnails, originals});
        });
    });

    app.post(
        '/media/uploadBackgroud',
        upload.single('image'),
        async (req, res) => {
            const file = req.file;
            if (!file) {
                return res.status(400).json({error: 'No file uploaded'});
            }
            const originalPath = path.join(backgroundsPath, file.originalname);
            const thumbPath = path.join(
                backgroundsPath,
                file.originalname.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1')
            );

            try {
                // Move original file to backgrounds directory
                fs.renameSync(file.path, originalPath);

                // Create a thumbnail
                await sharp(originalPath)
                    .resize({width: 150, height: 150, fit: 'cover'})
                    .toFile(thumbPath);

                return res.json({
                    success: true,
                    message: 'Image uploaded successfully'
                });
            } catch (err) {
                return res.status(500).json({error: 'Failed to process image'});
            }
        }
    );
    app.post(
        '/media/uploadProfilePic',
        upload.single('image'),
        async (req, res) => {
            const {username} = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({error: 'No file uploaded'});
            }

            // Set the target filenames
            const baseFilename = `${username}.png`;
            const originalPath = path.join(profilePicturesPath, baseFilename);

            try {
                // Move the uploaded file to the desired location, replacing the existing file
                fs.renameSync(file.path, originalPath);

                return res.json({
                    success: true,
                    message: 'Image uploaded and replaced successfully'
                });
            } catch (err) {
                return res.status(500).json({error: 'Failed to process image'});
            }
        }
    );
    app.post('/media/deleteBackground', async (req, res) => {
        const {fileName} = req.body;
        const originalPath = path.join(backgroundsPath, fileName);
        const thumbPath = path.join(
            backgroundsPath,
            fileName.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1')
        );

        try {
            await fsAsync.stat(originalPath);
            await fsAsync.unlink(originalPath);
            await fsAsync.stat(thumbPath);
            await fsAsync.unlink(thumbPath);

            return res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } catch (err) {
            return res.status(500).json({error: 'Failed to delete image'});
        }
    });

    app.get('/media/deleteBackground', (req, res) => {
        return res.status(405).json({error: 'Method not allowed'});
    });

    app.get(
        '/media/getAllReportImages',
        (req: express.Request, res: express.Response): void => {
            fs.readdir(reportImagesPath, (err, files) => {
                if (err) {
                    res.status(500).json({
                        error: 'Failed to read reportImages directory'
                    });
                    return;
                }
                const thumbnails = files.filter((f) => f.includes('_thumb'));
                const originals = files.filter((f) => !f.includes('_thumb'));
                res.json({thumbnails, originals});
                return;
            });
            return;
        }
    );

    const uploadReportImage = multer({dest: 'uploads/temp/'});
    app.post(
        '/media/uploadReportImage',
        uploadReportImage.single('image'),
        async (req: express.Request, res: express.Response): Promise<void> => {
            const file = req.file;
            const {reportName} = req.body; // expects form-field "reportName"
            if (!file || !reportName) {
                res.status(400).json({
                    error: 'Missing image file or reportName'
                });
                return;
            }

            const ext = path.extname(file.originalname);
            const timestamp = Date.now();
            const wrapped = `report_${reportName}_${timestamp}`;
            const originalName = `${wrapped}${ext}`;
            const thumbName = `${wrapped}_thumb${ext}`;

            const destOriginal = path.join(reportImagesPath, originalName);
            const destThumb = path.join(reportImagesPath, thumbName);

            try {
                fs.renameSync(file.path, destOriginal);
                await sharp(destOriginal)
                    .resize(150, 150, {fit: 'cover'})
                    .toFile(destThumb);

                res.json({
                    success: true,
                    original: originalName,
                    thumbnail: thumbName
                });
                return;
            } catch (err) {
                console.error('uploadReportImage error', err);
                res.status(500).json({error: 'Failed to process report image'});
                return;
            }
        }
    );

    // Handle home assistant like authentication (trick Shelly Wall Display)
    app.post('/auth/login_flow', (req, res) => {
        res.json({
            flow_id: 'something',
            data_schema: ['username', 'haha_password']
        });
    });
    // #endregion
}

function registerZitadelIfNeeded(app: express.Express) {
    if (loginStrategy === 'zitadel-introspection') {
        logger.debug('applying zitadel login strategy');
        passport.use(new ZitadelIntrospectionStrategy(configRc.oidc!.backend));
        app.use(passport.initialize());
    }
}

function registerFrontEnd(app: express.Express) {
    if (configRc.components?.web?.relativeClientPath) {
        const clientPath = path.join(
            __dirname,
            configRc.components.web.relativeClientPath
        );
        app.use('/', express.static(clientPath));
        logger.info('frontend static path %s', clientPath);
    }
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
    setupNodeRed();

    // register web controllers
    const messageHandler = new MessageHandler();

    const shellyHandler = new ShellyWebsocketHandler();
    const clientHandler = new ClientWebsocketHandler(messageHandler);
    const localHandler = new LocalWebsocketHandler(messageHandler, config);

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
            cert: config.https_crt
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
    app.use(
        NODE_RED_SETTINGS.httpNodeRoot,
        [isLoggedIn, isNotDefaultUser],
        RED.httpNode
    );
    app.use(
        NODE_RED_SETTINGS.httpAdminRoot,
        [isLoggedIn, isNotDefaultUser],
        RED.httpAdmin
    );
    RED.start();
}
