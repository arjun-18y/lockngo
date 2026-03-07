-- Booking lifecycle controls:
-- 1) Extend booking
-- 2) Cancel booking + refund record
-- 3) Auto-expiry processor that frees lockers

CREATE OR REPLACE FUNCTION public.extend_booking(
  p_booking_id UUID,
  p_units INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_locker public.lockers%ROWTYPE;
  v_interval INTERVAL;
  v_extra_amount NUMERIC(10, 2);
  v_new_end_time TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_units IS NULL OR p_units <= 0 THEN
    RAISE EXCEPTION 'Extension units must be greater than zero';
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
    AND user_id = v_user_id
    AND booking_status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active booking not found';
  END IF;

  IF v_booking.end_time <= now() THEN
    RAISE EXCEPTION 'Cannot extend an expired booking';
  END IF;

  SELECT *
  INTO v_locker
  FROM public.lockers
  WHERE id = v_booking.locker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Locker not found';
  END IF;

  IF v_booking.duration_type = 'hourly' THEN
    v_interval := make_interval(hours => p_units);
    v_extra_amount := v_locker.hourly_rate * p_units;
  ELSIF v_booking.duration_type = 'daily' THEN
    v_interval := make_interval(days => p_units);
    v_extra_amount := v_locker.daily_rate * p_units;
  ELSE
    RAISE EXCEPTION 'Unsupported duration type';
  END IF;

  v_new_end_time := v_booking.end_time + v_interval;

  UPDATE public.bookings
  SET
    end_time = v_new_end_time,
    amount = amount + v_extra_amount,
    updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.payments (
    booking_id,
    user_id,
    amount,
    payment_method,
    status,
    transaction_id
  )
  VALUES (
    p_booking_id,
    v_user_id,
    v_extra_amount,
    'extension',
    'completed',
    CONCAT('ext-', p_booking_id::text, '-', EXTRACT(EPOCH FROM now())::bigint::text)
  );

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'new_end_time', v_new_end_time,
    'extra_amount', v_extra_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_refund_amount NUMERIC(10, 2) := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
    AND user_id = v_user_id
    AND booking_status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active booking not found';
  END IF;

  -- Basic refund rule:
  -- Full refund before start; 50%% refund after start but before end.
  IF v_booking.payment_status = 'completed' THEN
    IF now() < v_booking.start_time THEN
      v_refund_amount := v_booking.amount;
    ELSIF now() < v_booking.end_time THEN
      v_refund_amount := round(v_booking.amount * 0.5, 2);
    ELSE
      v_refund_amount := 0;
    END IF;
  END IF;

  UPDATE public.bookings
  SET
    booking_status = 'cancelled',
    payment_status = CASE
      WHEN v_refund_amount > 0 THEN 'refunded'
      ELSE payment_status
    END,
    updated_at = now()
  WHERE id = p_booking_id;

  UPDATE public.lockers
  SET
    status = 'available',
    current_booking_id = NULL,
    updated_at = now()
  WHERE id = v_booking.locker_id
    AND (current_booking_id = p_booking_id OR current_booking_id IS NULL);

  IF v_refund_amount > 0 THEN
    INSERT INTO public.payments (
      booking_id,
      user_id,
      amount,
      payment_method,
      status,
      transaction_id
    )
    VALUES (
      p_booking_id,
      v_user_id,
      -v_refund_amount,
      'refund',
      'completed',
      CONCAT('refund-', p_booking_id::text, '-', EXTRACT(EPOCH FROM now())::bigint::text)
    );
  END IF;

  INSERT INTO public.notifications (user_id, message, type, is_read)
  VALUES (
    v_user_id,
    CASE
      WHEN v_refund_amount > 0
      THEN CONCAT('Booking cancelled. Refund of INR ', v_refund_amount::text, ' initiated.')
      ELSE 'Booking cancelled successfully.'
    END,
    'booking',
    false
  );

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'refund_amount', v_refund_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_booking_expiries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH expired AS (
    UPDATE public.bookings b
    SET
      booking_status = 'completed',
      updated_at = now()
    WHERE b.booking_status = 'active'
      AND b.end_time <= now()
    RETURNING b.id, b.user_id, b.locker_id
  ),
  release_lockers AS (
    UPDATE public.lockers l
    SET
      status = 'available',
      current_booking_id = NULL,
      updated_at = now()
    FROM expired e
    WHERE l.id = e.locker_id
    RETURNING l.id
  ),
  notify AS (
    INSERT INTO public.notifications (user_id, message, type, is_read)
    SELECT
      e.user_id,
      'Your locker booking has completed automatically at end time.',
      'booking',
      false
    FROM expired e
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_booking(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_booking_expiries() TO authenticated;
