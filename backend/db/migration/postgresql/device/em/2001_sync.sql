--------------UP
CREATE INDEX device_em__sync_device ON device_em.sync USING btree (device);
--------------DOWN
DROP INDEX device_em__sync_device;