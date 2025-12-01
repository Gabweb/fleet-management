--------------UP
SELECT set_chunk_time_interval('device_em.mv__total_energy_24_h', INTERVAL '1 year');

SELECT add_continuous_aggregate_policy(
    'device_em.mv__total_energy_24_h', 
    start_offset => INTERVAL '4 months',
    end_offset => INTERVAL '1 second',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => true
);

--------------DOWN
select 1;