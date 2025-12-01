--------------UP
CREATE FUNCTION ui.fn_dashboard_update(
    p_id INTEGER,
    p_name VARCHAR(250)
)
RETURNS void
AS
$$
BEGIN
    UPDATE ui.dashboard SET name = p_name WHERE id = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_update;