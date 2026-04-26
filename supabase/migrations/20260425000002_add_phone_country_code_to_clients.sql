-- Add phone_country_code to clients
-- Stores the international dial code separately from the local number
ALTER TABLE clients
  ADD COLUMN phone_country_code VARCHAR(10) NOT NULL DEFAULT '+56';

COMMENT ON COLUMN clients.phone_country_code IS 'International dial code, e.g. +56';
