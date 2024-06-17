--------------UP
CREATE FUNCTION "devices"."fnDeviceAdd"("pDevice" VARCHAR(50), "pJdoc" JSONB)
RETURNS void
AS
$$
BEGIN
    LOCK TABLE "devices"."state" IN SHARE ROW EXCLUSIVE MODE;
    IF "pDevice" IS NOT NULL AND NOT EXISTS (SELECT * FROM "devices"."state" WHERE id = "pDevice") THEN
        INSERT INTO "devices"."state" (id, "jdoc") VALUES ("pDevice", "pJdoc");
    ELSIF "pDevice" IS NOT NULL  THEN
        UPDATE
            "devices"."state"
        SET
            "jdoc" = CASE WHEN "pJdoc" IS NOT NULL THEN "pJdoc" ELSE jdoc END,
            updated = NOW()::TIMESTAMPTZ
        WHERE 1 = 1
            AND ("pDevice" IS NULL OR id = "pDevice");
    END IF;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "devices"."fnDeviceAdd";