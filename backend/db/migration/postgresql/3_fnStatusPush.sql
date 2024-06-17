--------------UP
CREATE FUNCTION "devices"."fnStatusPush"(
    "pTs" BIGINT,
    "pId" VARCHAR(50),
    "pField" VARCHAR(100),
    "pFieldGroup" VARCHAR(80),
    "pValue" NUMERIC(28, 8)
)
RETURNS void
AS
$$
BEGIN
    INSERT INTO "devices"."status" ("internalId", "ts", "field", "fieldGroup", "value")
    SELECT
        "internalId",
        to_timestamp("pTs") "ts",
        "pField" "field",
        "pFieldGroup" "fieldGroup",
        "pValue" "value"
    FROM
        "devices"."state" WHERE "id"="pId";
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "devices"."fnStatusPush";