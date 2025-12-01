--------------UP
CREATE TABLE IF NOT EXISTS device_em.stats (
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    channel SMALLINT,
    val REAL,
    phase VARCHAR (1),
    device INT NOT NULL,
    tag VARCHAR (30) NOT NULL
);

SELECT create_hypertable('device_em.stats', 'ts', chunk_time_interval => INTERVAL '24 hours');

ALTER TABLE device_em.stats SET (
    timescaledb.compress=true,
    timescaledb.compress_segmentby = 'device', 
    timescaledb.compress_orderby='ts',
    timescaledb.compress_chunk_time_interval='24 hours'
);

SELECT add_retention_policy('device_em.stats', INTERVAL '3 months');
SELECT add_compression_policy('device_em.stats', compress_created_before => INTERVAL '24 hours');
--------------DOWN
DROP TABLE device_em.stats;