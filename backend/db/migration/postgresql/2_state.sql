--------------UP
CREATE TABLE "devices"."state" (
    "internalId" SERIAL PRIMARY KEY,
    id VARCHAR(50),
    "controlAccess" SMALLINT DEFAULT 1, -- 1 - pending, 2 - denied, 3 - allowed
    created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMPTZ DEFAULT NULL,
    "jdoc" JSONB
);
CREATE UNIQUE INDEX devices_devices_id ON "devices"."state" (id);
--------------DOWN
DROP TABLE "devices"."state";