--------------UP
CREATE FUNCTION ui.fn_dashboard_add(
    p_name VARCHAR(250)
)
RETURNS INT
AS
$$
DECLARE
   r_id INT;
BEGIN
    INSERT INTO ui.dashboard (name) VALUES(p_name) RETURNING id INTO r_id;
    RETURN r_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_add;