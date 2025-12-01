--------------UP
CREATE TABLE device.list (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    external_id VARCHAR(50),
    control_access SMALLINT DEFAULT 1, -- 1 - pending, 2 - denied, 3 - allowed
    created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMPTZ DEFAULT NULL,
    jdoc JSONB
);
CREATE UNIQUE INDEX device_list_id ON device.list (id);
--------------DOWN
DROP TABLE device.list;
