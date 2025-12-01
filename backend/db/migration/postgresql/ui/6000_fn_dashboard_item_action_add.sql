--------------UP
CREATE FUNCTION ui.fn_dashboard_item_action_add(
    p_name VARCHAR,
    p_udf  JSONB
)
RETURNS INT
AS $$
DECLARE
    r_id INT;
BEGIN
    INSERT INTO ui.dashboard_item_action(name, udf)
    VALUES (p_name, p_udf)
    RETURNING id INTO r_id;
    RETURN r_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_action_add;
