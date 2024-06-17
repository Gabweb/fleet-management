--------------UP
CREATE FUNCTION "core"."fnSettingsAdd"("pKey" VARCHAR(100), "pValue" JSONB)
RETURNS void
AS
$$
BEGIN
    IF NOT EXISTS (SELECT * FROM "core"."settings" WHERE key = "pKey") THEN
        INSERT INTO "core"."settings" (key, value) VALUES ("pKey", "pValue");
    ELSIF "pDevice" IS NOT NULL  THEN
        UPDATE
            "core"."settings"
        SET
            value = "pValue",
            updated = NOW()::TIMESTAMPTZ
        WHERE key = "pKey";
    END IF;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "core"."fnSettingsAdd";