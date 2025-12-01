--------------UP
CREATE MATERIALIZED VIEW IF NOT EXISTS device.mv__status_presence
WITH (timescaledb.continuous) AS
    SELECT
        time_bucket(INTERVAL '5 min', s.ts) as bucket,
        s.id,
        MAX(s.field) field
    FROM
        "device".status s
    GROUP BY bucket, s.id
    ORDER BY bucket, s.id;
--------------DOWN
DROP MATERIALIZED VIEW device.mv__status_presence;