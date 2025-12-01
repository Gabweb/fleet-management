--------------UP
CREATE FUNCTION device.fn_status_push(
    p_ts BIGINT[],
    p_id INT[],
    p_field VARCHAR(100)[],
    p_field_group VARCHAR(80)[],
    p_value NUMERIC(28, 8)[],
    p_prev_value NUMERIC(28, 8)[]
)
RETURNS void
AS
$$
BEGIN
    INSERT INTO device.status (id, ts, field, field_group, "value", prev_value)
        SELECT
            id, to_timestamp(_ts) ts, field, field_group, value, prev_value
        FROM
            unnest(p_id, p_ts, p_field, p_field_group, p_value, p_prev_value) as u(id, _ts, field, field_group, value, prev_value);
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device.fn_status_push;
