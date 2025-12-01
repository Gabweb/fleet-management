--------------UP
CREATE OR REPLACE FUNCTION ui.fn_menuitem_fetch()
RETURNS TABLE(
    id         INT,
    name       VARCHAR,
    url        VARCHAR,
    icon_path  VARCHAR
)
AS
$$
BEGIN
    RETURN QUERY
      SELECT
        m.id,
        m.name,
        m.url,
        m.icon_path
      FROM ui.menu AS m
      ORDER BY m.id;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_menuitem_fetch;
