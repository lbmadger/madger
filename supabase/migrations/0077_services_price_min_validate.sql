-- Prix minimum 1 € : la contrainte 0074 était NOT VALID (posée alors qu'une
-- prestation à 0 € existait encore). Plus aucune ligne sous 100 centimes :
-- on la valide, elle couvre désormais toutes les lignes, y compris les
-- anciennes modifiées.
alter table public.services validate constraint services_price_min;
