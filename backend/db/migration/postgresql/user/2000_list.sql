--------------UP
CREATE TABLE "user".list (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    "group" VARCHAR(255),
    permissions VARCHAR(255)[],
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    name VARCHAR(250),
    password VARCHAR(250),
    full_name VARCHAR(250),
    email VARCHAR(250),
    udf JSONB -- user defined fields
);
CREATE UNIQUE INDEX user_list_id ON "user".list (id);
ALTER SEQUENCE "user".list_id_seq RESTART WITH 1000;
--------------DOWN
DROP TABLE "user".list;
