--------------UP
CREATE MATERIALIZED VIEW IF NOT EXISTS device_em.mv__total_energy_24_h
WITH (timescaledb.continuous) AS
    SELECT
        time_bucket(INTERVAL '24 hours', s.ts) as ts,
        s.device,
        s.phase,
        s.channel,
        s.tag,
        SUM(s.val) val
    FROM
        device_em.stats s
    WHERE
        s.tag = 'total_act_energy'
    GROUP BY s.device, s.phase, s.channel, s.tag, time_bucket(INTERVAL '24 hours', s.ts)
    ORDER BY s.device, s.phase, s.channel, s.tag, time_bucket(INTERVAL '24 hours', s.ts);
--------------DOWN
DROP MATERIALIZED VIEW device_em.mv__total_energy_24_h;