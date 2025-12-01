--------------UP
CREATE FUNCTION device_em.fn_last_sync(
    p_device INT,
    p_channel INT
)
    RETURNS table (created BIGINT)
AS
$$
    BEGIN
        IF (p_channel = -1) THEN
            RETURN QUERY (
                SELECT * FROM (
                    SELECT MAX(s.created) AS created FROM device_em.sync AS s WHERE s.device = p_device
                ) AS t WHERE t.created IS NOT NULL
            );
        ELSE
            RETURN QUERY (
                SELECT * FROM (
                    SELECT MAX(s.created) AS created FROM device_em.sync AS s WHERE s.device = p_device AND s.channel = p_channel
                ) AS t WHERE t.created IS NOT NULL
            );
        END IF;
    END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device_em.fn_last_sync;