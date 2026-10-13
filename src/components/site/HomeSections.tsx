import Link from "next/link";
import { homeContent } from "@/config/content";
import { media, propertyVideoUrl } from "@/config/media";
import { property } from "@/config/property";
import { MediaFrame } from "./MediaFrame";
import { VideoDialog } from "./VideoDialog";

function LeafIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M20 4C11 4 5 8 5 15c0 2 1 4 3 5 0-5 3-9 8-12-4 4-6 7-7 12 7 0 11-5 11-16Z" /></svg>; }
function Feature({ children }: { children: React.ReactNode }) { return <li className="feature-item"><span><LeafIcon /></span>{children}</li>; }

const highlightVisuals = [
  { kind: "photo", asset: media.pool },
  { kind: "editorial", text: "Um espaço para cozinhar, celebrar e ficar à mesa." },
  { kind: "editorial", text: "Quartos amplos para descansar com conforto." },
  { kind: "photo", asset: media.garden },
] as const;

function PhotoHighlight({ asset }: { asset: typeof media.pool | typeof media.garden }) {
  return <MediaFrame asset={asset} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="rounded-[1.1rem]" />;
}

function EditorialHighlight({ children }: { children: React.ReactNode }) {
  return <div className="highlight-editorial-panel"><LeafIcon /><p>{children}</p></div>;
}

export function WelcomeSection() { return <section id="a-chacara" className="home-section welcome-section"><div className="site-container welcome-grid"><div className="welcome-media"><MediaFrame asset={media.welcome} sizes="(max-width: 768px) 100vw, 52vw" className="rounded-[1.5rem]" />{propertyVideoUrl && <VideoDialog url={propertyVideoUrl} />}<p className="hand-note">{homeContent.welcome.note}</p></div><div className="welcome-copy"><p className="section-kicker">Bem-vindo à</p><h2>{homeContent.welcome.title}</h2><p>{homeContent.welcome.text}</p><ul>{homeContent.welcome.features.map((item) => <Feature key={item}>{item}</Feature>)}</ul><Link href="#acomodacoes" className="button-primary">Conheça a chácara <span aria-hidden>→</span></Link></div></div></section>; }

export function HighlightsSection() { return <section className="home-section highlights-section"><div className="site-container"><div className="section-heading-row"><div><h2>Destaques da sua estadia</h2><p>Tudo o que você precisa para viver dias incríveis.</p></div><Link href="#comodidades" className="text-link">Ver todas as comodidades <span aria-hidden>→</span></Link></div><div id="comodidades" className="highlight-grid">{property.highlights.map((item, index) => { const visual = highlightVisuals[index]; return <article key={item.title} className={`highlight-card highlight-card-${visual.kind}`}>{visual.kind === "photo" ? <PhotoHighlight asset={visual.asset} /> : <EditorialHighlight>{visual.text}</EditorialHighlight>}<div className="highlight-icon"><LeafIcon /></div><h3>{item.title}</h3><p>{item.text}</p></article>; })}</div></div></section>; }

export function AccommodationsSection() { return <section id="acomodacoes" className="home-section accommodation-section"><div className="site-container accommodation-grid"><div className="accommodation-copy"><p className="section-kicker">Acomodações</p><h2>Acomodações</h2><h3>{homeContent.accommodations.title}</h3><p>{homeContent.accommodations.text}</p><Link href="/reservar" className="button-primary">Consultar datas <span aria-hidden>→</span></Link></div><div className="accommodation-media"><MediaFrame asset={media.living} sizes="(max-width: 768px) 100vw, 58vw" className="rounded-[1.75rem]" /><p className="accommodation-caption">Sala de convivência</p></div></div></section>; }

export function ExperiencesSection() { return <section id="experiencias" className="home-section experiences-section"><div className="site-container"><p className="section-kicker">O que viver por aqui</p><h2>Experiências</h2><div className="experience-list">{homeContent.experiences.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></div></section>; }

export function GallerySection() { const gallery = [media.pool, media.sunset, media.welcome, media.garden, media.living, media.hero]; return <section id="galeria" className="home-section gallery-section"><div className="site-container"><div className="section-heading-row"><div><p className="section-kicker">Um pouco da Serra Verde</p><h2>Galeria de fotos</h2></div><Link href="/reservar" className="text-link">Planejar minha estadia <span aria-hidden>→</span></Link></div><div className="gallery-grid">{gallery.map((asset, index) => <MediaFrame key={asset.id} asset={asset} sizes={index === 0 ? "(max-width: 767px) 100vw, 50vw" : "(max-width: 767px) 50vw, 33vw"} className={`gallery-${index + 1}`} />)}</div></div></section>; }

export function LocationRulesSection() { return <section id="localizacao" className="home-section location-section"><div className="site-container location-grid"><article><p className="section-kicker">Perto o bastante para escapar</p><h2>Localização e como chegar</h2><p>{property.address.line} — {property.address.city}</p><p>{property.address.distanceNote}</p><a href={property.address.mapsUrl} className="button-primary">Abrir no Google Maps <span aria-hidden>↗</span></a></article><article><p className="section-kicker">Para todos aproveitarem</p><h2>Regras da casa</h2><ul>{property.houseRules.map((rule) => <li key={rule}>{rule}</li>)}</ul></article></div></section>; }

export function ContactSection() { return <section className="contact-section"><div className="site-container"><p className="section-kicker">Ainda ficou alguma dúvida?</p><h2>Fale com a gente</h2><p>Conte o que está planejando. Respondemos pelo WhatsApp e ajudamos você a organizar a estadia.</p><a className="contact-link" href={`https://wa.me/${property.contact.whatsapp}`}>Conversar no WhatsApp <span aria-hidden>→</span></a></div></section>; }
