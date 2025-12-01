--------------UP
CREATE FUNCTION "user".fn_delete(p_id INT)
RETURNS BIGINT
AS
$$
BEGIN
    UPDATE
        "user".list
    SET
        deleted = true
    WHERE
        id = p_id;
    RETURN p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "user".fn_delete;