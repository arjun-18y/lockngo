-- Dynamic locker sizes + admin bulk station seeding

CREATE TABLE IF NOT EXISTS public.locker_sizes (
  name TEXT PRIMARY KEY CHECK (name = lower(name)),
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.locker_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view locker sizes" ON public.locker_sizes;
CREATE POLICY "Anyone can view locker sizes"
  ON public.locker_sizes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage locker sizes" ON public.locker_sizes;
CREATE POLICY "Admins can manage locker sizes"
  ON public.locker_sizes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_locker_sizes_updated_at ON public.locker_sizes;
CREATE TRIGGER update_locker_sizes_updated_at
  BEFORE UPDATE ON public.locker_sizes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.locker_sizes (name, display_name, sort_order)
VALUES
  ('small', 'Small', 1),
  ('medium', 'Medium', 2),
  ('large', 'Large', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locker_sizes (name, display_name)
SELECT DISTINCT
  lower(trim(size)) AS name,
  initcap(replace(lower(trim(size)), '_', ' ')) AS display_name
FROM public.lockers
WHERE size IS NOT NULL
  AND trim(size) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE public.lockers
SET size = lower(trim(size))
WHERE size <> lower(trim(size));

ALTER TABLE public.lockers
  DROP CONSTRAINT IF EXISTS lockers_size_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lockers_size_fkey'
      AND conrelid = 'public.lockers'::regclass
  ) THEN
    ALTER TABLE public.lockers
      ADD CONSTRAINT lockers_size_fkey
      FOREIGN KEY (size)
      REFERENCES public.locker_sizes(name)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_station_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_station_id UUID;
  v_old_station_id UUID;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    v_new_station_id := NEW.station_id;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old_station_id := OLD.station_id;
  END IF;

  WITH target_station_ids AS (
    SELECT DISTINCT station_id
    FROM (VALUES (v_new_station_id), (v_old_station_id)) AS t(station_id)
    WHERE station_id IS NOT NULL
  ),
  counts AS (
    SELECT
      l.station_id,
      COUNT(*)::INT AS total_lockers,
      COUNT(*) FILTER (WHERE l.status = 'available')::INT AS available_lockers
    FROM public.lockers l
    INNER JOIN target_station_ids t ON t.station_id = l.station_id
    GROUP BY l.station_id
  )
  UPDATE public.stations s
  SET
    total_lockers = COALESCE(c.total_lockers, 0),
    available_lockers = COALESCE(c.available_lockers, 0)
  FROM target_station_ids t
  LEFT JOIN counts c ON c.station_id = t.station_id
  WHERE s.id = t.station_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_stations(
  p_station_count INTEGER DEFAULT 100,
  p_lockers_per_size INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_batch_tag TEXT := to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  v_station_ids UUID[];
  v_station_count INTEGER := 0;
  v_locker_count INTEGER := 0;
  v_size_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can seed stations';
  END IF;

  IF p_station_count IS NULL OR p_station_count < 1 OR p_station_count > 500 THEN
    RAISE EXCEPTION 'Station count must be between 1 and 500';
  END IF;

  IF p_lockers_per_size IS NULL OR p_lockers_per_size < 1 OR p_lockers_per_size > 50 THEN
    RAISE EXCEPTION 'Lockers per size must be between 1 and 50';
  END IF;

  SELECT COUNT(*) INTO v_size_count FROM public.locker_sizes;
  IF v_size_count = 0 THEN
    RAISE EXCEPTION 'No locker sizes configured. Add locker sizes first.';
  END IF;

  WITH inserted AS (
    INSERT INTO public.stations (name, location, city, state, platform_info, is_active)
    SELECT
      format('Demo Station %s-%s', v_batch_tag, lpad(gs::text, 3, '0')),
      format('Concourse Zone %s', ((gs - 1) % 8) + 1),
      (ARRAY['Mumbai', 'New Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'])[((gs - 1) % 10) + 1],
      (ARRAY['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Telangana', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'])[((gs - 1) % 10) + 1],
      format('Platforms %s-%s', ((gs - 1) % 6) + 1, ((gs - 1) % 6) + 2),
      true
    FROM generate_series(1, p_station_count) AS gs
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}'), COUNT(*)
  INTO v_station_ids, v_station_count
  FROM inserted;

  WITH size_catalog AS (
    SELECT
      name,
      ROW_NUMBER() OVER (ORDER BY sort_order, name) AS size_idx
    FROM public.locker_sizes
  )
  INSERT INTO public.lockers (station_id, locker_number, size, status, hourly_rate, daily_rate)
  SELECT
    station_id,
    format('S%02s-%02s', sz.size_idx, slot.slot_idx),
    sz.name,
    'available',
    (20 + ((sz.size_idx - 1) * 10))::NUMERIC(10, 2),
    ((20 + ((sz.size_idx - 1) * 10)) * 10)::NUMERIC(10, 2)
  FROM unnest(v_station_ids) AS station(station_id)
  CROSS JOIN size_catalog sz
  CROSS JOIN generate_series(1, p_lockers_per_size) AS slot(slot_idx);

  GET DIAGNOSTICS v_locker_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'stations_created', v_station_count,
    'lockers_created', v_locker_count,
    'sizes_used', v_size_count,
    'lockers_per_size', p_lockers_per_size
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_stations(INTEGER, INTEGER) TO authenticated;
