--------------UP
CREATE FUNCTION ui.fn_dashboard_item_action_update(
    p_id   INT,
    p_name VARCHAR,
    p_udf  JSONB
)
RETURNS VOID
AS $$
BEGIN
    UPDATE ui.dashboard_item_action
       SET name = p_name,
           udf  = p_udf
     WHERE id = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_action_update;
