--------------UP
CREATE OR REPLACE FUNCTION ui.fn_menuitem_update(
    p_id        INT,
    p_name      VARCHAR,
    p_url       VARCHAR,
    p_icon_path VARCHAR
)
RETURNS VOID
AS
$$
BEGIN
    UPDATE ui.menu
       SET name      = p_name,
           url       = p_url,
           icon_path = p_icon_path,
           updated   = CURRENT_TIMESTAMP
     WHERE id = p_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_menuitem_update(INT, VARCHAR, VARCHAR, VARCHAR);
