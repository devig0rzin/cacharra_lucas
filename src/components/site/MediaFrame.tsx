import Image from "next/image";
import type { MediaAsset } from "@/config/media";

interface Props { asset: MediaAsset; sizes: string; priority?: boolean; className?: string; label?: boolean }

export function MediaFrame({ asset, sizes, priority = false, className = "", label = true }: Props) {
  return <div className={`media-frame ${className}`} style={{ aspectRatio: `${asset.width}/${asset.height}` }}>
    {asset.src ? <Image src={asset.src} alt={asset.alt} fill sizes={sizes} priority={priority} placeholder={asset.blurDataURL ? "blur" : "empty"} blurDataURL={asset.blurDataURL} style={{ objectPosition: asset.focalPoint }} /> :
      <div className="media-placeholder" role="img" aria-label={`${asset.alt}. Foto pendente: ${asset.expectedFile}`}><svg aria-hidden viewBox="0 0 160 90" preserveAspectRatio="none"><path d="M0 72 38 31l25 24 25-35 72 52v18H0Z" /><circle cx="126" cy="24" r="9" /></svg>{label && <span>Foto aguardada · {asset.expectedFile}</span>}</div>}
  </div>;
}
