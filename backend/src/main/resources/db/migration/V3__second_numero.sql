-- Second numéro de l'entreprise (téléphone et WhatsApp), facultatif.
alter table company_settings
    add column secondary_phone           varchar(30) not null default '',
    add column secondary_whatsapp_number varchar(20) not null default '';

-- Numéro communiqué par l'entreprise ; modifiable dans l'administration.
update company_settings
set secondary_phone = '0653878201',
    secondary_whatsapp_number = '212653878201'
where id = 1;
