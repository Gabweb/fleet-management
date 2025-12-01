import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import CommandSender from '../src/model/CommandSender';

describe('permission checking', () => {
    const sender = new CommandSender(['device.*', 'user.view'], 'user');
    it('should cover deep nested cases', () => {
        assert.ok(sender.hasPermission('device.list.nested'));
    });

    it('should cover nested cases', () => {
        assert.ok(sender.hasPermission('device.update'));
    });

    it('star in required permission', () => {
        assert.ok(sender.hasPermission('device.*'));
    });

    it('no dot', () => {
        assert.ok(!sender.hasPermission('device'));
    });

    it('should not allow other permissions', () => {
        assert.ok(!sender.hasPermission('user.update'));
    });
});

describe('* permission', () => {
    const sender = new CommandSender(['*'], 'user');
    it('should cover deep nested cases', () => {
        assert.ok(sender.hasPermission('device.list.nested'));
    });

    it('should cover nested cases', () => {
        assert.ok(sender.hasPermission('device.update'));
    });

    it('star in required permission', () => {
        assert.ok(sender.hasPermission('device.*'));
    });
});

describe('check admin', () => {
    it('admin group', () => {
        assert.ok(new CommandSender([], 'admin').isAdmin());
    });

    it('* permission', () => {
        assert.ok(new CommandSender(['*'], 'user').isAdmin());
    });

    it('not admin', () => {
        assert.strictEqual(new CommandSender([''], 'user').isAdmin(), false);
    });
});
