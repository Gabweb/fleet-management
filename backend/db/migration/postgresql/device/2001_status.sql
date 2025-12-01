--------------UP
CREATE INDEX device__status_id ON device.status USING btree (id);
--------------DOWN
DROP INDEX device__status_id;
