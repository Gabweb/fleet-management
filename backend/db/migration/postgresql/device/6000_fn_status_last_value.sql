--------------UP
CREATE FUNCTION device.fn_status_last_value(
    p_id INT,
    p_field VARCHAR(100)
)
RETURNS table (
    last_value NUMERIC(28, 8)
)
AS
$$
BEGIN
    RETURN QUERY (
        WITH cte AS (
            SELECT
                MAX(ts) ts
            FROM
                device.status
            WHERE
                id = p_id
                AND field = p_field

        )
        SELECT
            "value" AS last_value
        FROM
            device.status
        WHERE
            id = p_id
            AND ts = (SELECT cte.ts FROM cte)
            AND field = p_field
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device.fn_status_last_value;