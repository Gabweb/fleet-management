--------------UP
CREATE TABLE device_group.type (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NULL
);
CREATE UNIQUE INDEX device_group_type_id ON device_group.type (id);
--------------DOWN
DROP TABLE device_group.type;