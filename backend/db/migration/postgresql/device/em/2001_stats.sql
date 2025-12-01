--------------UP
CREATE INDEX device_em__stats_device ON device_em.stats USING btree (device);
--------------DOWN
DROP INDEX device_em__stats_device;