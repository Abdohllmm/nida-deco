// Types des réponses de l'API (miroir des DTO du backend).

export type PublicationStatus = "DRAFT" | "PUBLISHED";
export type Availability = "IN_STOCK" | "ON_ORDER" | "OUT_OF_STOCK";
export type NeedType = "AMENAGEMENT" | "CUISINE" | "DRESSING_PLACARD" | "CHAMBRE" | "MOBILIER" | "MENUISERIE" | "PRODUIT" | "AUTRE";
export type RequestStatus = "NEW" | "IN_PROGRESS" | "DONE";
export type ProductSort = "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

export interface Media {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface AdminMedia extends Media {
  originalName: string | null;
  contentType: string;
  sizeBytes: number;
  usageCount: number;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  position: number;
  itemCount: number | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  reference: string;
  shortDescription: string;
  category: Category;
  /** null = prix sur demande. */
  price: number | null;
  availability: Availability;
  status: PublicationStatus;
  featured: boolean;
  demo: boolean;
  mainImage: Media | null;
  updatedAt: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  dimensions: string | null;
  materials: string | null;
  colorOptions: string[];
  gallery: Media[];
  createdAt: string;
}

export interface ProductPublicDetail {
  product: ProductDetail;
  similar: ProductSummary[];
}

export interface ServiceSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  mainImage: Media | null;
  displayOrder: number;
  status: PublicationStatus;
  featured: boolean;
  demo: boolean;
  updatedAt: string;
}

export interface ServiceDetail extends ServiceSummary {
  description: string;
  gallery: Media[];
  includedItems: string[];
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  category: Category;
  location: string | null;
  mainImage: Media | null;
  status: PublicationStatus;
  demo: boolean;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  description: string;
  gallery: Media[];
  beforeImage: Media | null;
  afterImage: Media | null;
  createdAt: string;
}

export interface CompanySettings {
  displayName: string;
  phone: string;
  whatsappNumber: string;
  /** Second numéro, facultatif (chaîne vide si absent). */
  secondaryPhone: string;
  secondaryWhatsappNumber: string;
  instagramUrl: string;
  contactEmail: string;
  city: string;
  address: string;
  openingHours: string;
  aboutText: string;
  logo: Media | null;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: Media | null;
  introTitle: string;
  introText: string;
}

export interface ContactRequestAdmin {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  needType: NeedType;
  message: string;
  location: string | null;
  budget: string | null;
  consent: boolean;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  products: number;
  services: number;
  projects: number;
  contactRequests: number;
  newContactRequests: number;
  /** Contenus d'exemple encore présents. */
  demoItems: number;
  latestRequests: ContactRequestAdmin[];
}

export interface Session {
  email: string;
}
