--------------UP
CREATE FUNCTION "core"."fnRegistryFetch"(
    "pKey" VARCHAR(100)
) RETURNS table (
        key VARCHAR(100),
        value JSONB
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            d.key,
            d.value
        FROM
            "core"."registry" d
        WHERE
            1 = 1
            AND ("pKey" IS NULL OR d.key = "pKey")
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "core"."fnRegistryFetch";