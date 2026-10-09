import { DateSearchForm } from "@/components/booking/DateSearchForm";
import { AccommodationsSection, ContactSection, ExperiencesSection, GallerySection, HighlightsSection, LocationRulesSection, WelcomeSection } from "@/components/site/HomeSections";
import { HeroLandscape } from "@/components/site/HeroLandscape";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { homeContent } from "@/config/content";
import { property } from "@/config/property";

function BadgeIcon({ index }: { index: number }) {
  if (index === 1) return <svg viewBox="0 0 24 24" aria-hidden><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="3" /><path d="M2 20c0-4 2-7 6-7s6 3 6 7M14 14c4-1 7 2 7 6" /></svg>;
  if (index === 2) return <svg viewBox="0 0 24 24" aria-hidden><path d="m3 20 8-15 4 8 2-3 4 10H3Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M20 4C10 4 5 9 5 15c0 2 1 4 3 5 0-5 3-9 8-12-4 4-6 8-7 12 7 0 11-5 11-16Z" /></svg>;
}

export default function Home() {
  return <><SiteHeader overlay /><main id="conteudo">
    <section className="hero-section">
      <HeroLandscape />
      <div className="site-container hero-content"><p className="hero-eyebrow">{homeContent.eyebrow}</p><h1>{property.tagline}</h1><p className="hero-description">{homeContent.heroDescription}</p><ul className="hero-badges">{homeContent.badges.map((badge, index) => <li key={badge}><span><BadgeIcon index={index} /></span>{badge}</li>)}</ul></div>
      <div className="site-container booking-overlap"><DateSearchForm /></div>
    </section>
    <WelcomeSection /><HighlightsSection /><AccommodationsSection /><ExperiencesSection /><GallerySection /><LocationRulesSection /><ContactSection />
  </main><SiteFooter /><WhatsAppButton /></>;
}
