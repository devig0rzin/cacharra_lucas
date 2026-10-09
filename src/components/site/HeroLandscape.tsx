import { media } from "@/config/media";
import { MediaFrame } from "./MediaFrame";

export function HeroLandscape() {
  return <div aria-hidden className="absolute inset-0 overflow-hidden"><MediaFrame asset={media.hero} sizes="100vw" priority className="hero-media absolute inset-0" label={false} /><div className="hero-scrim absolute inset-0" /></div>;
}
