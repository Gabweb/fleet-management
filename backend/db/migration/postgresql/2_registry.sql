--------------UP
CREATE TABLE "core"."registry" (
    created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMPTZ DEFAULT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NULL
);
--------------DOWN
DROP TABLE "devices"."registry";