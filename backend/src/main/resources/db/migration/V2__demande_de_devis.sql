-- Champs complémentaires du formulaire de devis.
alter table contact_requests
    add column location varchar(160),
    add column budget   varchar(80),
    -- Le visiteur a accepté d'être recontacté au sujet de sa demande.
    add column consent  boolean not null default false;

-- Nouveaux textes par défaut de l'accueil. Chaque texte n'est remplacé que s'il n'a
-- pas été personnalisé dans l'administration depuis l'installation.
update company_settings
set hero_title = 'Votre intérieur, pensé et réalisé sur mesure.'
where hero_title = 'Des espaces pensés pour votre quotidien';

update company_settings
set hero_subtitle = 'Cuisines modernes, dressings, placards, mobilier et aménagements intérieurs adaptés à vos besoins.'
where hero_subtitle like 'Aménagement intérieur, créations sur mesure et mobilier : NIDAL DECO vous accompagne%';

update company_settings
set intro_title = 'Des solutions adaptées à votre espace'
where intro_title = 'Aménagement, sur-mesure et mobilier';

update company_settings
set intro_text = 'NIDAL DECO accompagne les particuliers dans leurs projets d''aménagement intérieur, de la définition du besoin à la réalisation. Chaque projet est pensé selon l''espace, le style souhaité et les usages du quotidien.'
where intro_text like 'NIDAL DECO réalise des aménagements intérieurs et des créations sur mesure%';

update company_settings
set about_text = 'NIDAL DECO est une entreprise d''aménagement intérieur et de menuiserie sur mesure basée à Casablanca. Elle réalise des cuisines modernes, des dressings, des placards, du mobilier et des aménagements intérieurs, ainsi que des travaux de menuiserie bois et aluminium. Elle propose également du mobilier à la vente.'
where about_text like 'NIDAL DECO est une entreprise basée à Casablanca. Elle propose la décoration intérieure%';
