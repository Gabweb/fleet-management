--------------UP
CREATE FUNCTION device_em.fn_report_mount_diff(
    p_devices INTEGER[],
    p_period device_em.t_period,
    p_period_look_back INT,
    p_end_period_day INT
)
    RETURNS table (
        device INTEGER,
        record_date VARCHAR(12),
        total_energy_kw REAL
    )
AS
$$
BEGIN
    CREATE TEMPORARY TABLE main_data (
        device INTEGER,
        start_date timestamp with time zone,
        end_date timestamp with time zone,
        record_date VARCHAR(12),
        total_energy_kw REAL,
        rn BIGINT
    ) ON COMMIT DROP;
    CREATE TEMPORARY TABLE epoch_time (
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE
    ) ON COMMIT DROP;

    INSERT INTO epoch_time (
        SELECT *
        FROM device_em.fn_report_period(p_period, p_period_look_back, p_end_period_day)
    );
    INSERT INTO main_data (
        SELECT * FROM device_em.fn_report_diff(
            p_devices,
            (SELECT et.start_date FROM epoch_time et),
            (SELECT et.end_date FROM epoch_time et),
            p_period
        )
    );

    RETURN QUERY (
        SELECT
            t1.device,
            t1.record_date,
            CASE WHEN t2.rn is not NULL THEN t2.total_energy_kw ELSE t1.total_energy_kw end total_energy_kw
        FROM
            main_data t1
        LEFT JOIN
            (
                SELECT t.device, SUM(t.total_energy_kw) total_energy_kw, MAX(t.rn) rn FROM main_data AS t
                group BY t.device
            ) t2
        ON t1.device = t2.device and t1.rn = t2.rn
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device_em.fn_report_mount_diff;