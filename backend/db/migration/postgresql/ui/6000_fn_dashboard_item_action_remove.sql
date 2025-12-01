--------------UP
CREATE FUNCTION ui.fn_dashboard_item_action_remove(
    p_id INT
)
RETURNS VOID
AS $$
BEGIN
    DELETE FROM ui.dashboard_item_action
     WHERE id = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_action_remove;
