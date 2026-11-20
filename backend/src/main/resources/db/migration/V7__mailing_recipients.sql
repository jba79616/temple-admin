-- 帖子（安斗邀請）寄送名單：一列一個收件地址。連到戶的列印戶長與戶地址，可另填收件人；
-- 沒連到戶的列自帶姓名、郵遞、地址，不為了寄帖而建戶。
CREATE TABLE mailing_recipients (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_id   BIGINT UNIQUE REFERENCES households(id),
  recipient_name VARCHAR(50),
  zip            VARCHAR(6),
  address        VARCHAR(200),
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  source         VARCHAR(50),
  note           VARCHAR(200),
  version        INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (household_id IS NOT NULL OR (recipient_name IS NOT NULL AND address IS NOT NULL))
);
CREATE INDEX ix_mailing_recipients_name ON mailing_recipients (recipient_name) WHERE recipient_name IS NOT NULL;
