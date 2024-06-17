--------------UP
CREATE TABLE "devices"."status" (
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    "internalId" INT NOT NULL,
    "value" NUMERIC(28, 8) NULL,
    "fieldGroup" VARCHAR(80) NOT NULL,
    field VARCHAR(100) NOT NULL
);
SELECT create_hypertable('"devices"."status"', 'ts', chunk_time_interval => INTERVAL '24 hours');

ALTER TABLE "devices"."status" SET (
    timescaledb.compress=true,
    timescaledb.compress_segmentby = '"internalId"',
    timescaledb.compress_orderby='ts',
    timescaledb.compress_chunk_time_interval='24 hours'
);

SELECT add_retention_policy('"devices"."status"', INTERVAL '24 hours');
SELECT add_compression_policy('"devices"."status"', compress_created_before => INTERVAL '24 hours');
--------------DOWN
DROP TABLE "devices"."status";