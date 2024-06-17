--------------UP
CREATE MATERIALIZED VIEW IF NOT EXISTS "devices"."mv.status.presence"
WITH (timescaledb.continuous) AS
    SELECT
        time_bucket(INTERVAL '5 min', s.ts) as bucket,
        s."internalId",
        MAX(s.field) field
    FROM
        "devices"."status" s
    GROUP BY bucket, s."internalId"
    ORDER BY bucket, s."internalId";
--------------DOWN
DROP MATERIALIZED VIEW "devices"."mv.status.presence";