--------------UP
CREATE OR REPLACE FUNCTION ui.fn_menuitem_add(
    p_name      VARCHAR,
    p_url       VARCHAR,
    p_icon_path VARCHAR
)
RETURNS INT
AS
$$
DECLARE
    new_id INT;
BEGIN
    INSERT INTO ui.menu(name, url, icon_path)
    VALUES (p_name, p_url, p_icon_path)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_menuitem_add(VARCHAR, VARCHAR, VARCHAR);
