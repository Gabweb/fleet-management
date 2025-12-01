--------------UP
CREATE TABLE device.status (
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    id INT NOT NULL,
    "value" NUMERIC(28, 8) NULL,
    prev_value NUMERIC(28, 8) NULL,
    field_group VARCHAR(80) NOT NULL,
    field VARCHAR(100) NOT NULL
);
SELECT create_hypertable('device.status', 'ts', chunk_time_interval => INTERVAL '24 hours');

ALTER TABLE device.status SET (
    timescaledb.compress=true,
    timescaledb.compress_segmentby = 'id',
    timescaledb.compress_orderby='ts',
    timescaledb.compress_chunk_time_interval='24 hours'
);

SELECT add_retention_policy('device.status', INTERVAL '24 hours');
SELECT add_compression_policy('device.status', compress_created_before => INTERVAL '24 hours');
--------------DOWN
DROP TABLE device.status;
