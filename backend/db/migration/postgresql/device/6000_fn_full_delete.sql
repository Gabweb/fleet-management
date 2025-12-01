--------------UP
CREATE FUNCTION device.fn_full_delete(p_id INT)
RETURNS void
AS
$$
BEGIN
    DELETE FROM device.status WHERE id = p_id;
    DELETE FROM device.list WHERE id = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device.fn_full_delete;