--------------UP
CREATE OR REPLACE FUNCTION ui.fn_dashboard_item_action_fetch()
  RETURNS TABLE(id INT, name VARCHAR, udf JSONB)
AS
$$
BEGIN
  RETURN QUERY
    SELECT t.id   AS id,
           t.name AS name,
           t.udf  AS udf
      FROM ui.dashboard_item_action AS t;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_action_fetch;
