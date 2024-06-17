--------------UP
CREATE FUNCTION "devices"."fnDeviceFetch"(
    "pDevice" VARCHAR(50),
    "pControlAccess" SMALLINT DEFAULT NULL
) RETURNS table (
        id VARCHAR(50),
        "controlAccess" SMALLINT,
        created TIMESTAMPTZ,
        updated TIMESTAMPTZ,
        "jdoc" JSONB
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            d.id,
            d."controlAccess",
            d.created,
            d.updated,
            d."jdoc"
        FROM
            "devices"."state" d
        WHERE
            1 = 1
            AND ("pControlAccess" IS NULL OR d."controlAccess" = "pControlAccess")
            AND ("pDevice" IS NULL OR d.id = "pDevice")
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "devices"."fnDeviceFetch";