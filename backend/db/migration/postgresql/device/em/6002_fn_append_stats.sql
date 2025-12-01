--------------UP
CREATE FUNCTION device_em.fn_append_stats(
    p_device INT[],
    p_tag VARCHAR (30)[],
    p_phase VARCHAR (1)[],
    p_channel SMALLINT[],
    p_ts BIGINT[],
    p_val REAL[]
)
RETURNS void
AS
$$
    INSERT INTO device_em.stats (device, tag, phase, channel, ts, val)
    SELECT
        device, tag, phase, channel, to_timestamp(_ts), val
    FROM
        unnest(p_device, p_tag, p_phase, p_channel, p_ts, p_val) as u(device, tag, phase, channel, _ts, val);
$$
LANGUAGE sql;
--------------DOWN
SELECT 123;
