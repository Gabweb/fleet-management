--------------UP
CREATE FUNCTION "devices"."fnControlAccessAllow"(
    "pId" VARCHAR(50)
)
RETURNS void
AS
$$
BEGIN
    UPDATE "devices"."state" SET "controlAccess" = 3 WHERE id = "pId";
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "devices"."fnControlAccessAllow";

