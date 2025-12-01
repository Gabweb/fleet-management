--------------UP
CREATE FUNCTION device_em.fn_report_period(
    p_period device_em.t_period,
    p_period_look_back INT,
    p_end_period_day INT
) 
-- endPeriodDay: last day of the measurement (INT: days .. eg, 1 or 2 or .... 28)
-- period: daily, monthly, yearly
    RETURNS table (
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE
    )
AS
$$
BEGIN
    RETURN QUERY (
        SELECT
            (TO_DATE(
                DATE_PART(
                    'year',
                    (SELECT TO_TIMESTAMP(MAX(s.created)) created_max FROM device_em.sync s)
                ) || '-' ||
                DATE_PART(
                    'month',
                    (SELECT TO_TIMESTAMP(MAX(s.created)) created_max FROM device_em.sync s)
                ) ||
                ('-'||CAST(p_end_period_day AS VARCHAR)),
                'YYYY-MM-DD'
            ) - (SELECT (p_period_look_back||' '||p_period)::interval))::timestamp AT TIME ZONE (select current_setting('timezone')) start_date
            ,TO_DATE(
                DATE_PART(
                    'year',
                    (SELECT TO_TIMESTAMP(MAX(s.created)) created_max FROM device_em.sync s)
                ) || '-' ||
                DATE_PART(
                    'month', (SELECT TO_TIMESTAMP(MAX(s.created)) created_max FROM device_em.sync s)
                ) ||
                ('-'||CAST(p_end_period_day AS VARCHAR)),
                'YYYY-MM-DD'
            )::timestamp AT TIME ZONE (select current_setting('timezone')) end_date
    );
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device_em.fn_report_period;