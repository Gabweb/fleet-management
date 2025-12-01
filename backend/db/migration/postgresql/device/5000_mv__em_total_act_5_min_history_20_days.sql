--------------UP
CREATE MATERIALIZED VIEW IF NOT EXISTS device.mv__em_total_act_5_min_history_20_days
WITH (timescaledb.continuous) AS
    SELECT
        time_bucket(INTERVAL '5 min', s.ts) as bucket,
        s.id,
        s.field,
        s.field_group,
        MAX(s.value) value_max,
        AVG(s.value) value_avg,
        MIN(s.value) value_min,
        MAX(s.prev_value) prev_val_max,
        AVG(s.prev_value) prev_val_avg,
        MIN(s.prev_value) prev_val_min
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
            'switch:*.aenergy.total',
            'switch:*.voltage',
            'switch:*.apower',
            'switch:*.temperature.tC',
            'switch:*.current',
            'switch:*.temperature.tF'
        )
    GROUP BY
        bucket,
        s.id,
        s.field_group,
        s.field;
--------------DOWN
DROP MATERIALIZED VIEW device.mv__em_total_act_5_min_history_20_days;
