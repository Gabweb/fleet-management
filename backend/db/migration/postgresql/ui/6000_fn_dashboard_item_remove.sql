--------------UP
CREATE FUNCTION ui.fn_dashboard_item_remove(
    p_dashboard     INT,
    p_dashboard_item INT
)
RETURNS INT
LANGUAGE plpgsql
AS
$$
DECLARE
    r_id INT;
BEGIN
    DELETE FROM ui.dashboard_item
     WHERE dashboard = p_dashboard
       AND id        = p_dashboard_item
    RETURNING id INTO r_id;

    RETURN r_id;
END;
$$;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_remove(INT, INT);
