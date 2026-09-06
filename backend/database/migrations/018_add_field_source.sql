ALTER TABLE device_data_fields ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Update existing fields to default source based on dot-notation prefix
UPDATE device_data_fields 
SET source = CASE 
    WHEN strpos(field_name, '.') > 0 THEN split_part(field_name, '.', 1)
    ELSE 'default'
END
WHERE source IS NULL;
