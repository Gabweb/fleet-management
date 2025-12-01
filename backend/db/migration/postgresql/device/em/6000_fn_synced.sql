--------------UP
CREATE FUNCTION device_em.fn_synced(
    p_device INT,
    p_created BIGINT, p_channel INT
)
    RETURNS table (created BIGINT)
AS
$$
    INSERT INTO device_em.sync (device, created, channel) VALUES (p_device, p_created, p_channel) RETURNING created;
$$
LANGUAGE sql;
--------------DOWN
DROP FUNCTION device_em.fn_synced;