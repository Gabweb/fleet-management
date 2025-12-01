--------------UP
CREATE FUNCTION device_em.fn_dump_stats(
    p_devices   INTEGER[],
    p_start     TIMESTAMP WITH TIME ZONE,
    p_end       TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    ts      TIMESTAMP WITH TIME ZONE,
    channel SMALLINT,
    val     REAL,
    phase   VARCHAR(1),
    device  INTEGER,
    tag     VARCHAR(30)
)
AS
$$
BEGIN
    RETURN QUERY
    SELECT
        s.ts,
        s.channel,
        s.val,
        s.phase,
        s.device,
        s.tag
    FROM
        device_em.stats s
    WHERE
        s.device = ANY(p_devices)
        AND s.ts BETWEEN p_start AND p_end;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device_em.fn_dump_stats(INTEGER[], TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
