--------------UP
CREATE OR REPLACE FUNCTION ui.fn_menuitem_remove(
    p_url VARCHAR
)
RETURNS VOID
AS
$$
BEGIN
    DELETE FROM ui.menu
    WHERE url = p_url;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_menuitem_remove(VARCHAR);
