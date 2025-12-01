--------------UP
CREATE FUNCTION ui.fn_dashboard_remove(
    p_id INTEGER
)
RETURNS  VOID
AS
$$
BEGIN
    DELETE FROM ui.dashboard WHERE id = p_id;
    DELETE FROM ui.dashboard_item WHERE dashboard = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_remove;