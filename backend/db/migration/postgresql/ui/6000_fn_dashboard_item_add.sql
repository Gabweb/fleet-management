--------------UP
CREATE FUNCTION ui.fn_dashboard_item_add(
    p_dashboard INT,
    p_type INT,
    p_item INT,
    p_order INT DEFAULT 0,
    p_sub_item VARCHAR(250) DEFAULT NULL
)
RETURNS INT
AS
$$
DECLARE
   r_id INT;
BEGIN
    INSERT INTO ui.dashboard_item (dashboard, type, item, "order", sub_item) VALUES(p_dashboard, p_type, p_item, p_order, p_sub_item)  RETURNING id INTO r_id;
    RETURN r_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_add;