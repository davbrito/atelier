ALTER TABLE "client_measurements" ALTER COLUMN "value" SET DATA TYPE real USING (
	replace(regexp_replace(trim(lower("value")), '[^0-9,.]', '', 'g'), ',', '.')
)::real;