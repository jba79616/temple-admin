ALTER TABLE daily_closings
  ADD COLUMN original_counted_cash INT,
  ADD COLUMN amend_reason          VARCHAR(200),
  ADD COLUMN amended_by            BIGINT REFERENCES users(id),
  ADD COLUMN amended_at            TIMESTAMPTZ;
