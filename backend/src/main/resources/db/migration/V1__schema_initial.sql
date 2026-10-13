-- Schéma initial du site Nidal Deco.

create table admin_users (
    id            uuid primary key,
    email         varchar(254) not null,
    password_hash varchar(100) not null,
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null,
    constraint uq_admin_users_email unique (email)
);

create table media_assets (
    id            uuid primary key,
    filename      varchar(80)  not null,
    original_name varchar(255),
    content_type  varchar(50)  not null,
    size_bytes    bigint       not null,
    width         integer,
    height        integer,
    alt_text      varchar(255) not null default '',
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null,
    constraint uq_media_assets_filename unique (filename)
);
create index idx_media_assets_created_at on media_assets (created_at desc);

create table product_categories (
    id         uuid primary key,
    name       varchar(120) not null,
    slug       varchar(140) not null,
    position   integer      not null default 0,
    created_at timestamptz  not null,
    updated_at timestamptz  not null,
    constraint uq_product_categories_slug unique (slug)
);

create table project_categories (
    id         uuid primary key,
    name       varchar(120) not null,
    slug       varchar(140) not null,
    position   integer      not null default 0,
    created_at timestamptz  not null,
    updated_at timestamptz  not null,
    constraint uq_project_categories_slug unique (slug)
);

create table products (
    id                uuid primary key,
    name              varchar(180)   not null,
    slug              varchar(200)   not null,
    reference         varchar(60)    not null,
    short_description varchar(300)   not null default '',
    description       text           not null default '',
    category_id       uuid           not null references product_categories (id),
    price             numeric(12, 2),
    availability      varchar(20)    not null,
    dimensions        varchar(200),
    materials         varchar(300),
    color_options     text,
    main_image_id     uuid references media_assets (id),
    status            varchar(20)    not null,
    featured          boolean        not null default false,
    demo              boolean        not null default false,
    created_at        timestamptz    not null,
    updated_at        timestamptz    not null,
    constraint uq_products_slug unique (slug),
    constraint uq_products_reference unique (reference),
    -- Un prix absent signifie « prix sur demande » : jamais de prix nul ou négatif.
    constraint ck_products_price_positive check (price is null or price > 0)
);
create index idx_products_status_created on products (status, created_at desc);
create index idx_products_category on products (category_id);
create index idx_products_main_image on products (main_image_id);

create table product_images (
    product_id uuid    not null references products (id) on delete cascade,
    media_id   uuid    not null references media_assets (id),
    position   integer not null,
    primary key (product_id, position)
);
create index idx_product_images_media on product_images (media_id);

create table services (
    id                uuid primary key,
    title             varchar(180) not null,
    slug              varchar(200) not null,
    short_description varchar(300) not null default '',
    description       text         not null default '',
    main_image_id     uuid references media_assets (id),
    included_items    text,
    display_order     integer      not null default 0,
    status            varchar(20)  not null,
    featured          boolean      not null default false,
    demo              boolean      not null default false,
    created_at        timestamptz  not null,
    updated_at        timestamptz  not null,
    constraint uq_services_slug unique (slug)
);
create index idx_services_status_order on services (status, display_order);
create index idx_services_main_image on services (main_image_id);

create table service_images (
    service_id uuid    not null references services (id) on delete cascade,
    media_id   uuid    not null references media_assets (id),
    position   integer not null,
    primary key (service_id, position)
);
create index idx_service_images_media on service_images (media_id);

create table projects (
    id              uuid primary key,
    title           varchar(180) not null,
    slug            varchar(200) not null,
    category_id     uuid         not null references project_categories (id),
    description     text         not null default '',
    location        varchar(160),
    main_image_id   uuid references media_assets (id),
    before_image_id uuid references media_assets (id),
    after_image_id  uuid references media_assets (id),
    status          varchar(20)  not null,
    demo            boolean      not null default false,
    created_at      timestamptz  not null,
    updated_at      timestamptz  not null,
    constraint uq_projects_slug unique (slug)
);
create index idx_projects_status_created on projects (status, created_at desc);
create index idx_projects_category on projects (category_id);
create index idx_projects_main_image on projects (main_image_id);
create index idx_projects_before_image on projects (before_image_id);
create index idx_projects_after_image on projects (after_image_id);

create table project_images (
    project_id uuid    not null references projects (id) on delete cascade,
    media_id   uuid    not null references media_assets (id),
    position   integer not null,
    primary key (project_id, position)
);
create index idx_project_images_media on project_images (media_id);

create table contact_requests (
    id         uuid primary key,
    name       varchar(120) not null,
    phone      varchar(30)  not null,
    email      varchar(254),
    need_type  varchar(40)  not null,
    message    text         not null,
    status     varchar(20)  not null,
    created_at timestamptz  not null,
    updated_at timestamptz  not null
);
create index idx_contact_requests_created on contact_requests (created_at desc);
create index idx_contact_requests_status_created on contact_requests (status, created_at desc);

-- Ligne unique : paramètres de l'entreprise, modifiables dans l'administration.
create table company_settings (
    id              smallint primary key,
    display_name    varchar(120) not null,
    phone           varchar(30)  not null default '',
    whatsapp_number varchar(20)  not null default '',
    instagram_url   varchar(255) not null default '',
    contact_email   varchar(254) not null default '',
    city            varchar(120) not null default '',
    address         varchar(300) not null default '',
    opening_hours   varchar(500) not null default '',
    about_text      text         not null default '',
    logo_id         uuid references media_assets (id),
    hero_title      varchar(200) not null default '',
    hero_subtitle   varchar(500) not null default '',
    hero_image_id   uuid references media_assets (id),
    intro_title     varchar(200) not null default '',
    intro_text      text         not null default '',
    updated_at      timestamptz  not null,
    constraint ck_company_settings_singleton check (id = 1)
);

-- Seules les informations fournies par l'entreprise sont préremplies.
insert into company_settings (id, display_name, phone, whatsapp_number, instagram_url, city,
                              about_text, hero_title, hero_subtitle, intro_title, intro_text, updated_at)
values (1,
        'NIDAL DECO',
        '0661568771',
        '212661568771',
        'https://www.instagram.com/nidal_deco1/',
        'Casablanca',
        'NIDAL DECO est une entreprise basée à Casablanca. Elle propose la décoration intérieure, l''aménagement clé en main, les cuisines modernes, les dressings, les placards ainsi que la menuiserie bois et aluminium. Elle propose également du mobilier à la vente.',
        'Des espaces pensés pour votre quotidien',
        'Aménagement intérieur, créations sur mesure et mobilier : NIDAL DECO vous accompagne à Casablanca, de l''idée à la réalisation.',
        'Aménagement, sur-mesure et mobilier',
        'NIDAL DECO réalise des aménagements intérieurs et des créations sur mesure — cuisines, dressings, placards, menuiserie bois et aluminium — et propose du mobilier à la vente. Chaque demande commence par un échange pour comprendre votre besoin.',
        now());
