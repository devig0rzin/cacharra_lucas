export interface MediaAsset {
  id: string;
  src: string | null;
  alt: string;
  width: number;
  height: number;
  focalPoint?: `${number}% ${number}%`;
  blurDataURL?: string;
  expectedFile: string;
}

export const media = {
  hero: { id: "hero", src: "/images/topo-chacara.jpg", expectedFile: "topo-chacara.jpg", alt: "Vista ampla da Chácara Serra Verde entre montanhas e vegetação", width: 1264, height: 848, focalPoint: "60% 48%" },
  welcome: { id: "welcome", src: "/images/video-capa.jpg", expectedFile: "video-capa.jpg", alt: "Área externa da chácara ao entardecer", width: 1312, height: 816, focalPoint: "50% 52%" },
  pool: { id: "pool", src: "/images/piscina.jpg", expectedFile: "piscina.jpg", alt: "Piscina de borda infinita com vista para as montanhas", width: 1200, height: 896, focalPoint: "50% 58%" },
  gourmet: { id: "gourmet", src: null, expectedFile: "area-gourmet.jpg", alt: "Área gourmet preparada para receber grupos", width: 1200, height: 900 },
  bedroom: { id: "bedroom", src: null, expectedFile: "acomodacoes.jpg", alt: "Quarto confortável da Chácara Serra Verde", width: 1200, height: 900 },
  garden: { id: "garden", src: "/images/natureza.jpg", expectedFile: "natureza.jpg", alt: "Caminho entre árvores e vegetação preservada", width: 1200, height: 896, focalPoint: "48% 50%" },
  living: { id: "living", src: "/images/sala.jpg", expectedFile: "sala.jpg", alt: "Sala de convivência ampla com materiais naturais e vista para as montanhas", width: 1264, height: 848, focalPoint: "50% 48%" },
  sunset: { id: "sunset", src: "/images/por-do-sol.jpg", expectedFile: "por-do-sol.jpg", alt: "Pôr do sol dourado sobre as montanhas visto da varanda", width: 1264, height: 848, focalPoint: "52% 48%" },
  firepit: { id: "firepit", src: null, expectedFile: "fogo-de-chao.jpg", alt: "Espaço de fogo de chão para encontros ao ar livre", width: 1600, height: 1067 },
} satisfies Record<string, MediaAsset>;

export const propertyVideoUrl: string | null = null;
