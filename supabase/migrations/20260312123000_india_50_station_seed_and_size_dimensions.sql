-- Add locker size dimensions and hardcoded India station seed (50 stations).

ALTER TABLE public.locker_sizes
  ADD COLUMN IF NOT EXISTS dimensions TEXT;

UPDATE public.locker_sizes
SET dimensions = CASE name
  WHEN 'small' THEN 'Side 35 cm, Height 40 cm'
  WHEN 'medium' THEN 'Side 45 cm, Height 55 cm'
  WHEN 'large' THEN 'Side 60 cm, Height 75 cm'
  ELSE dimensions
END
WHERE name IN ('small', 'medium', 'large');

CREATE OR REPLACE FUNCTION public.seed_india_stations_50()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_inserted_stations INTEGER := 0;
  v_target_stations INTEGER := 0;
  v_inserted_lockers INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can seed stations';
  END IF;

  -- Keep default sizes aligned to fixed pricing and dimensions.
  INSERT INTO public.locker_sizes (name, display_name, dimensions, sort_order)
  VALUES
    ('small', 'Small', 'Side 35 cm, Height 40 cm', 1),
    ('medium', 'Medium', 'Side 45 cm, Height 55 cm', 2),
    ('large', 'Large', 'Side 60 cm, Height 75 cm', 3)
  ON CONFLICT (name)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    dimensions = EXCLUDED.dimensions,
    sort_order = EXCLUDED.sort_order;

  WITH station_seed(name, city, state, location, platform_info) AS (
    VALUES
      ('New Delhi Railway Station', 'New Delhi', 'Delhi', 'Ajmeri Gate Concourse', 'Platforms 1-3'),
      ('Old Delhi Junction', 'Delhi', 'Delhi', 'Main Hall', 'Platforms 4-6'),
      ('Mumbai CSMT', 'Mumbai', 'Maharashtra', 'Suburban Entry Lobby', 'Platforms 1-4'),
      ('Mumbai Central', 'Mumbai', 'Maharashtra', 'Departure Hall', 'Platforms 5-7'),
      ('Dadar Railway Station', 'Mumbai', 'Maharashtra', 'Central Concourse', 'Platforms 1-5'),
      ('Bengaluru City Junction', 'Bengaluru', 'Karnataka', 'Main Concourse', 'Platforms 2-5'),
      ('Yeshwantpur Junction', 'Bengaluru', 'Karnataka', 'East Entry Hall', 'Platforms 1-3'),
      ('Chennai Central', 'Chennai', 'Tamil Nadu', 'North Concourse', 'Platforms 2-6'),
      ('Chennai Egmore', 'Chennai', 'Tamil Nadu', 'South Hall', 'Platforms 1-4'),
      ('Howrah Junction', 'Howrah', 'West Bengal', 'Main Terminal Hall', 'Platforms 1-5'),
      ('Sealdah Station', 'Kolkata', 'West Bengal', 'North Wing Lobby', 'Platforms 6-8'),
      ('Kolkata Station', 'Kolkata', 'West Bengal', 'East Concourse', 'Platforms 2-4'),
      ('Hyderabad Deccan', 'Hyderabad', 'Telangana', 'Nampally Hall', 'Platforms 1-3'),
      ('Secunderabad Junction', 'Secunderabad', 'Telangana', 'Central Gate Hall', 'Platforms 4-7'),
      ('Kacheguda Station', 'Hyderabad', 'Telangana', 'Main Entry', 'Platforms 1-3'),
      ('Pune Junction', 'Pune', 'Maharashtra', 'Main Concourse', 'Platforms 1-4'),
      ('Nagpur Junction', 'Nagpur', 'Maharashtra', 'City Side Hall', 'Platforms 2-5'),
      ('Nashik Road', 'Nashik', 'Maharashtra', 'South Lobby', 'Platforms 1-3'),
      ('Ahmedabad Junction', 'Ahmedabad', 'Gujarat', 'Main Hall', 'Platforms 1-4'),
      ('Vadodara Junction', 'Vadodara', 'Gujarat', 'West Concourse', 'Platforms 2-5'),
      ('Surat Station', 'Surat', 'Gujarat', 'North Gate Hall', 'Platforms 3-6'),
      ('Jaipur Junction', 'Jaipur', 'Rajasthan', 'Pink City Hall', 'Platforms 1-4'),
      ('Jodhpur Junction', 'Jodhpur', 'Rajasthan', 'Main Concourse', 'Platforms 2-4'),
      ('Udaipur City', 'Udaipur', 'Rajasthan', 'Lake Side Hall', 'Platforms 1-2'),
      ('Lucknow Charbagh', 'Lucknow', 'Uttar Pradesh', 'Main Dome Hall', 'Platforms 1-4'),
      ('Kanpur Central', 'Kanpur', 'Uttar Pradesh', 'Central Concourse', 'Platforms 3-6'),
      ('Varanasi Junction', 'Varanasi', 'Uttar Pradesh', 'Kashi Hall', 'Platforms 1-3'),
      ('Prayagraj Junction', 'Prayagraj', 'Uttar Pradesh', 'Civil Lines Hall', 'Platforms 2-5'),
      ('Patna Junction', 'Patna', 'Bihar', 'Main Hall', 'Platforms 1-4'),
      ('Gaya Junction', 'Gaya', 'Bihar', 'Front Concourse', 'Platforms 2-3'),
      ('Bhopal Junction', 'Bhopal', 'Madhya Pradesh', 'Upper Hall', 'Platforms 1-4'),
      ('Jabalpur Junction', 'Jabalpur', 'Madhya Pradesh', 'Main Lobby', 'Platforms 2-4'),
      ('Indore Junction', 'Indore', 'Madhya Pradesh', 'City Hall', 'Platforms 1-3'),
      ('Bhubaneswar Station', 'Bhubaneswar', 'Odisha', 'Temple City Hall', 'Platforms 1-4'),
      ('Cuttack Junction', 'Cuttack', 'Odisha', 'Main Concourse', 'Platforms 2-3'),
      ('Puri Station', 'Puri', 'Odisha', 'Pilgrim Hall', 'Platforms 1-2'),
      ('Guwahati Station', 'Guwahati', 'Assam', 'Brahmaputra Hall', 'Platforms 1-3'),
      ('Dibrugarh Station', 'Dibrugarh', 'Assam', 'Tea City Hall', 'Platforms 1-2'),
      ('Ranchi Junction', 'Ranchi', 'Jharkhand', 'Central Hall', 'Platforms 1-3'),
      ('Tatanagar Junction', 'Jamshedpur', 'Jharkhand', 'Steel City Hall', 'Platforms 2-4'),
      ('Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala', 'Main Hall', 'Platforms 1-3'),
      ('Ernakulam Junction', 'Kochi', 'Kerala', 'City Side Hall', 'Platforms 2-4'),
      ('Kozhikode Station', 'Kozhikode', 'Kerala', 'Malabar Hall', 'Platforms 1-3'),
      ('Visakhapatnam Junction', 'Visakhapatnam', 'Andhra Pradesh', 'Harbor Hall', 'Platforms 2-5'),
      ('Vijayawada Junction', 'Vijayawada', 'Andhra Pradesh', 'Krishna Hall', 'Platforms 1-4'),
      ('Tirupati Station', 'Tirupati', 'Andhra Pradesh', 'Pilgrim Entry Hall', 'Platforms 1-3'),
      ('Coimbatore Junction', 'Coimbatore', 'Tamil Nadu', 'Main Concourse', 'Platforms 2-4'),
      ('Madurai Junction', 'Madurai', 'Tamil Nadu', 'Temple Hall', 'Platforms 1-3'),
      ('Amritsar Junction', 'Amritsar', 'Punjab', 'Golden Hall', 'Platforms 1-3'),
      ('Chandigarh Junction', 'Chandigarh', 'Chandigarh', 'North Concourse', 'Platforms 1-2')
  ),
  to_insert AS (
    SELECT ss.*
    FROM station_seed ss
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.stations s
      WHERE s.name = ss.name
        AND s.city = ss.city
        AND s.state = ss.state
    )
  ),
  inserted AS (
    INSERT INTO public.stations (name, city, state, location, platform_info, is_active)
    SELECT name, city, state, location, platform_info, true
    FROM to_insert
    RETURNING id
  ),
  target_stations AS (
    SELECT s.id
    FROM public.stations s
    INNER JOIN station_seed ss
      ON s.name = ss.name
     AND s.city = ss.city
     AND s.state = ss.state
  ),
  size_seed(size_name, size_code, hourly_rate, daily_rate, base_no) AS (
    VALUES
      ('small', 'S', 20::NUMERIC, 200::NUMERIC, 100),
      ('medium', 'M', 35::NUMERIC, 320::NUMERIC, 200),
      ('large', 'L', 50::NUMERIC, 450::NUMERIC, 300)
  )
  INSERT INTO public.lockers (station_id, locker_number, size, status, hourly_rate, daily_rate)
  SELECT
    ts.id,
    format('%s-%s', sz.size_code, lpad((sz.base_no + n.seq)::TEXT, 3, '0')),
    sz.size_name,
    'available',
    sz.hourly_rate,
    sz.daily_rate
  FROM target_stations ts
  CROSS JOIN size_seed sz
  CROSS JOIN generate_series(1, 5) AS n(seq)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lockers l
    WHERE l.station_id = ts.id
      AND l.locker_number = format('%s-%s', sz.size_code, lpad((sz.base_no + n.seq)::TEXT, 3, '0'))
  );

  GET DIAGNOSTICS v_inserted_lockers = ROW_COUNT;

  SELECT COUNT(*) INTO v_inserted_stations
  FROM (
    SELECT 1
    FROM public.stations s
    WHERE EXISTS (
      SELECT 1
      FROM (
        VALUES
          ('New Delhi Railway Station', 'New Delhi', 'Delhi'),
          ('Old Delhi Junction', 'Delhi', 'Delhi'),
          ('Mumbai CSMT', 'Mumbai', 'Maharashtra'),
          ('Mumbai Central', 'Mumbai', 'Maharashtra'),
          ('Dadar Railway Station', 'Mumbai', 'Maharashtra'),
          ('Bengaluru City Junction', 'Bengaluru', 'Karnataka'),
          ('Yeshwantpur Junction', 'Bengaluru', 'Karnataka'),
          ('Chennai Central', 'Chennai', 'Tamil Nadu'),
          ('Chennai Egmore', 'Chennai', 'Tamil Nadu'),
          ('Howrah Junction', 'Howrah', 'West Bengal'),
          ('Sealdah Station', 'Kolkata', 'West Bengal'),
          ('Kolkata Station', 'Kolkata', 'West Bengal'),
          ('Hyderabad Deccan', 'Hyderabad', 'Telangana'),
          ('Secunderabad Junction', 'Secunderabad', 'Telangana'),
          ('Kacheguda Station', 'Hyderabad', 'Telangana'),
          ('Pune Junction', 'Pune', 'Maharashtra'),
          ('Nagpur Junction', 'Nagpur', 'Maharashtra'),
          ('Nashik Road', 'Nashik', 'Maharashtra'),
          ('Ahmedabad Junction', 'Ahmedabad', 'Gujarat'),
          ('Vadodara Junction', 'Vadodara', 'Gujarat'),
          ('Surat Station', 'Surat', 'Gujarat'),
          ('Jaipur Junction', 'Jaipur', 'Rajasthan'),
          ('Jodhpur Junction', 'Jodhpur', 'Rajasthan'),
          ('Udaipur City', 'Udaipur', 'Rajasthan'),
          ('Lucknow Charbagh', 'Lucknow', 'Uttar Pradesh'),
          ('Kanpur Central', 'Kanpur', 'Uttar Pradesh'),
          ('Varanasi Junction', 'Varanasi', 'Uttar Pradesh'),
          ('Prayagraj Junction', 'Prayagraj', 'Uttar Pradesh'),
          ('Patna Junction', 'Patna', 'Bihar'),
          ('Gaya Junction', 'Gaya', 'Bihar'),
          ('Bhopal Junction', 'Bhopal', 'Madhya Pradesh'),
          ('Jabalpur Junction', 'Jabalpur', 'Madhya Pradesh'),
          ('Indore Junction', 'Indore', 'Madhya Pradesh'),
          ('Bhubaneswar Station', 'Bhubaneswar', 'Odisha'),
          ('Cuttack Junction', 'Cuttack', 'Odisha'),
          ('Puri Station', 'Puri', 'Odisha'),
          ('Guwahati Station', 'Guwahati', 'Assam'),
          ('Dibrugarh Station', 'Dibrugarh', 'Assam'),
          ('Ranchi Junction', 'Ranchi', 'Jharkhand'),
          ('Tatanagar Junction', 'Jamshedpur', 'Jharkhand'),
          ('Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala'),
          ('Ernakulam Junction', 'Kochi', 'Kerala'),
          ('Kozhikode Station', 'Kozhikode', 'Kerala'),
          ('Visakhapatnam Junction', 'Visakhapatnam', 'Andhra Pradesh'),
          ('Vijayawada Junction', 'Vijayawada', 'Andhra Pradesh'),
          ('Tirupati Station', 'Tirupati', 'Andhra Pradesh'),
          ('Coimbatore Junction', 'Coimbatore', 'Tamil Nadu'),
          ('Madurai Junction', 'Madurai', 'Tamil Nadu'),
          ('Amritsar Junction', 'Amritsar', 'Punjab'),
          ('Chandigarh Junction', 'Chandigarh', 'Chandigarh')
      ) AS seed(name, city, state)
      WHERE seed.name = s.name
        AND seed.city = s.city
        AND seed.state = s.state
    )
  ) q;

  v_target_stations := 50;

  RETURN jsonb_build_object(
    'stations_in_seed', v_target_stations,
    'stations_present', v_inserted_stations,
    'lockers_inserted', v_inserted_lockers,
    'lockers_per_station_per_size', 5
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_india_stations_50() TO authenticated;
