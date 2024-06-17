--------------UP
CREATE FUNCTION "devices"."fnControlAccessDeny"(
    "pId" VARCHAR(50)
)
RETURNS void
AS
$$
BEGIN
    UPDATE "devices"."state" SET "controlAccess" = 2 WHERE id = "pId";
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION "devices"."fnControlAccessDeny";

