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
  hero: { id: "hero", src: null, expectedFile: "topo-chacara.jpg", alt: "Vista ampla da Chácara Serra Verde entre montanhas e vegetação", width: 2400, height: 1600, focalPoint: "62% 48%" },
  welcome: { id: "welcome", src: null, expectedFile: "video-capa.jpg", alt: "Área externa da chácara ao entardecer", width: 1600, height: 1000, focalPoint: "50% 50%" },
  pool: { id: "pool", src: null, expectedFile: "piscina.jpg", alt: "Piscina da chácara com vista para o verde", width: 1200, height: 900 },
  gourmet: { id: "gourmet", src: null, expectedFile: "area-gourmet.jpg", alt: "Área gourmet preparada para receber grupos", width: 1200, height: 900 },
  bedroom: { id: "bedroom", src: null, expectedFile: "acomodacoes.jpg", alt: "Quarto confortável da Chácara Serra Verde", width: 1200, height: 900 },
  garden: { id: "garden", src: null, expectedFile: "natureza.jpg", alt: "Jardim cercado por árvores e natureza preservada", width: 1200, height: 900 },
  living: { id: "living", src: null, expectedFile: "sala.jpg", alt: "Sala de estar ampla e acolhedora", width: 1600, height: 1067 },
  sunset: { id: "sunset", src: null, expectedFile: "por-do-sol.jpg", alt: "Pôr do sol visto da propriedade", width: 1600, height: 1067 },
  firepit: { id: "firepit", src: null, expectedFile: "fogo-de-chao.jpg", alt: "Espaço de fogo de chão para encontros ao ar livre", width: 1600, height: 1067 },
} satisfies Record<string, MediaAsset>;

export const propertyVideoUrl: string | null = null;
