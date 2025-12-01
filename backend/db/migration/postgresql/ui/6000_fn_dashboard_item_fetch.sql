--------------UP
CREATE FUNCTION ui.fn_dashboard_item_fetch(
    p_id INT
)
RETURNS  table (
    id INT,
    dashboard INT,
    type INT,
    item INT,
    "order" INT,
    sub_item VARCHAR(250),
    type_name VARCHAR(100)
)
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            di.id,
            di.dashboard,
            di.type,
            di.item,
            di."order",
            di.sub_item,
            dit.name type_name
        FROM
            ui.dashboard_item di
        LEFT JOIN
            ui.dashboard_item_type dit
            ON dit.id = di.type
        WHERE
            di.dashboard = p_id
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION ui.fn_dashboard_item_fetch;