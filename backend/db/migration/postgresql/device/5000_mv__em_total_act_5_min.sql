--------------UP
CREATE MATERIALIZED VIEW IF NOT EXISTS device.mv__em_total_act_5_min
WITH (timescaledb.continuous) AS
    SELECT
        time_bucket(INTERVAL '5 min', s.ts) as bucket,
        s.id,
        CASE
            WHEN
                s.field_group IN (
                    'emdata:*.total_act',
                    'emdata:*.a_total_act_energy',
                    'emdata:*.b_total_act_energy',
                    'emdata:*.c_total_act_energy',
                    'em1data:*.total_act_energy',
                    'switch:*.aenergy.total'
                )
            THEN 'in'
            ELSE 'out'
        END metric,
        MAX(s.value) watts
    FROM
        device.status s
    WHERE
        s.field_group IN (
            'emdata:*.total_act',
            'emdata:*.a_total_act_energy',
            'emdata:*.b_total_act_energy',
            'emdata:*.c_total_act_energy',
            'emdata:*.total_act_ret',
            'emdata:*.a_total_act_ret_energy',
            'emdata:*.b_total_act_ret_energy',
            'emdata:*.c_total_act_ret_energy',
            'em1data:*.total_act_energy',
            'em1data:*.total_act_energy_ret',
            'switch:*.ret_aenergy.total',
            'switch:*.aenergy.total'
        )
    GROUP BY
        bucket,
        s.id,
        metric;
--------------DOWN
DROP MATERIALIZED VIEW device.mv__em_total_act_5_min;
