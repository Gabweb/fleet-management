--------------UP
CREATE OR REPLACE FUNCTION ui.fn_config_fetch()
RETURNS TABLE(
    name       VARCHAR(300),
    icon_path  JSONB
)
AS
$$
BEGIN
    RETURN QUERY
      SELECT c.name, c.json FROM ui.config AS c;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_config_fetch;
