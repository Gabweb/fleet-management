--------------UP
CREATE FUNCTION device.fn_control_access_allow(
    p_id INT
)
RETURNS void
AS
$$
BEGIN
    UPDATE device.list SET control_access = 3 WHERE id = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device.fn_control_access_allow;

