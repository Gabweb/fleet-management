--------------UP
CREATE FUNCTION ui.fn_dashboard_fetch()
RETURNS  table (
        id INT,
        name VARCHAR(300)
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT d.id, d.name FROM ui.dashboard d
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_fetch;