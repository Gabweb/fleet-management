--------------UP
CREATE FUNCTION "user".fn_update(
    p_id INT,
    p_enabled BOOLEAN DEFAULT NULL,
    p_password VARCHAR(250) DEFAULT NULL,
    p_full_name VARCHAR(250) DEFAULT NULL,
    p_group VARCHAR(255) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_permissions VARCHAR(255)[]  DEFAULT NULL
)
RETURNS BIGINT
AS
$$
BEGIN
    UPDATE "user".list SET
        email = COALESCE(p_email, email),
        password = COALESCE(p_password, password),
        enabled = COALESCE(p_enabled, enabled),
        full_name = COALESCE(p_full_name, full_name),
        "group" = COALESCE(p_group, "group"),
        permissions = COALESCE(p_permissions, permissions)
    WHERE
        id = p_id;
    RETURN p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "user".fn_update;