--------------UP
CREATE FUNCTION "user".fn_get(
    p_id INT DEFAULT NULL,
    p_name VARCHAR(250) DEFAULT NULL,
    p_password VARCHAR(250) DEFAULT NULL
)
RETURNS table (
        id INT,
        enabled BOOLEAN,
        deleted BOOLEAN,
        name VARCHAR(250),
        full_name VARCHAR(250),
        email VARCHAR(250),
        "group" VARCHAR(255),
        permissions VARCHAR(255)[],
        created TIMESTAMP WITH TIME ZONE,
        updated TIMESTAMP WITH TIME ZONE,
        udf JSONB
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            d.id,
            d.enabled,
            d.deleted,
            d.name,
            d.full_name,
            d.email,
            d.group,
            d.permissions,
            d.created,
            d.updated,
            d.udf
        FROM
            "user".list d
        WHERE
            1 = 1
            AND (p_id IS NULL OR d.id = p_id)
            AND (p_name IS NULL OR (d.name = p_name)
            AND (p_password IS NULL OR d.password = p_password))
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "user".fn_get;