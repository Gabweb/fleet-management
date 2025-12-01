--------------UP
CREATE FUNCTION device_em.fn_report_ranges()
    RETURNS table (
        device VARCHAR (100),
        total_records BIGINT,
        firs_rec TIMESTAMP WITH TIME ZONE,
        last_rec TIMESTAMP WITH TIME ZONE
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            s.device,
            COUNT(s.device) total_records,
            MIN(s.ts) firs_rec,
            MAX(s.ts) last_rec
        FROM device_em.mv__total_energy_24_h s
        GROUP BY
            s.device
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device_em.fn_report_ranges;