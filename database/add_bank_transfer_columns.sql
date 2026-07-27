-- =====================================================
-- Add Bank Transfer Payment Support
-- =====================================================

-- Add bank transfer columns to restaurants table
DO $$
BEGIN
  -- Check and add payment_card_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'payment_card_enabled'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN payment_card_enabled BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✓ Added payment_card_enabled column to restaurants';
  END IF;

  -- Check and add payment_terminal_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'payment_terminal_enabled'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN payment_terminal_enabled BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✓ Added payment_terminal_enabled column to restaurants';
  END IF;

  -- Check and add payment_cash_bar_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'payment_cash_bar_enabled'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN payment_cash_bar_enabled BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✓ Added payment_cash_bar_enabled column to restaurants';
  END IF;

  -- Check and add payment_bank_transfer_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'payment_bank_transfer_enabled'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN payment_bank_transfer_enabled BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✓ Added payment_bank_transfer_enabled column to restaurants';
  END IF;
END $$;

-- Add bank transfer columns to orders table
DO $$
BEGIN
  -- Check and add bank_transfer_clabe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'bank_transfer_clabe'
  ) THEN
    ALTER TABLE orders ADD COLUMN bank_transfer_clabe TEXT;
    RAISE NOTICE '✓ Added bank_transfer_clabe column to orders';
  END IF;

  -- Check and add bank_transfer_reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'bank_transfer_reference'
  ) THEN
    ALTER TABLE orders ADD COLUMN bank_transfer_reference TEXT;
    RAISE NOTICE '✓ Added bank_transfer_reference column to orders';
  END IF;

  -- Check and add bank_transfer_agreement
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'bank_transfer_agreement'
  ) THEN
    ALTER TABLE orders ADD COLUMN bank_transfer_agreement TEXT;
    RAISE NOTICE '✓ Added bank_transfer_agreement column to orders';
  END IF;

  -- Check and add bank_transfer_due_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'bank_transfer_due_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN bank_transfer_due_date TIMESTAMPTZ;
    RAISE NOTICE '✓ Added bank_transfer_due_date column to orders';
  END IF;

  RAISE NOTICE '✓ Bank transfer columns migration completed successfully';
END $$;
