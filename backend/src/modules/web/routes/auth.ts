import express from 'express';
const router = express.Router();
import {login, verifyToken} from '../../user';

router.post('/login', (req, res) => {
    const {username, password} = req.body;
    const token = login(username, password);
    if (token === undefined) {
        res.status(400).json({isok: false}).end();
        return;
    }

    res.json({
        isok: true,
        token
    }).end();
});

router.post('/info', (req, res) => {
    let auth = req.headers?.authorization || (req.query.auth as string);

    if (auth === undefined) {
        res.sendStatus(403).end();
        return;
    }

    if (auth.startsWith('Bearer ')) {
        auth = auth.substring(7);
    }

    const token = verifyToken(auth);

    if (token === undefined) {
        res.status(400).json({isok: false}).end();
        return;
    }

    res.json({isok: true, token});
});

export default router;
