--------------UP
CREATE FUNCTION "user".fn_add(
    p_name VARCHAR(250),
    p_enabled BOOLEAN,
    p_password VARCHAR(250),
    p_full_name VARCHAR(250),
    p_group VARCHAR(255),
    p_email VARCHAR(255),
    p_permissions VARCHAR(255)[]
)
RETURNS  table (
    id INT
)
AS
$$
BEGIN
    RETURN QUERY
    INSERT INTO
        "user".list (name, password, full_name, "group", permissions, enabled, email)
    VALUES(p_name, p_password, p_full_name, p_group, p_permissions, p_enabled, p_email)
        RETURNING list.id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "user".fn_add;