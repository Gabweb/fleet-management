--------------UP
CREATE FUNCTION device.fn_fetch(
    p_external_id VARCHAR(50) DEFAULT NULL,
    p_id INT DEFAULT NULL,
    p_control_access SMALLINT DEFAULT NULL
) RETURNS table (
        external_id VARCHAR(50),
        id INT,
        control_access SMALLINT,
        created TIMESTAMPTZ,
        updated TIMESTAMPTZ,
        jdoc JSONB
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            d.external_id,
            d.id,
            d.control_access,
            d.created,
            d.updated,
            d.jdoc
        FROM
            device.list d
        WHERE
            1 = 1
            AND (p_control_access IS NULL OR d.control_access = p_control_access)
            AND (p_external_id IS NULL OR d.external_id = p_external_id)
            AND (p_id IS NULL OR d.id = p_id)
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device.fn_fetch;