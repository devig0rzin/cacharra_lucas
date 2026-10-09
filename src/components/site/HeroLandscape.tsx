/**
 * Paisagem ilustrada provisória — ocupa o lugar da foto/vídeo principal
 * até o cliente enviar o material. Trocar por <Image> ou <video> da chácara.
 */
export function HeroLandscape() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#e9b872_0%,#d98c4e_32%,#6f7f5c_62%,#2a4a33_100%)]" />
      <div className="absolute left-[62%] top-[22%] h-28 w-28 rounded-full bg-[#ffe1a6] opacity-80 blur-[2px]" />
      <svg className="absolute inset-x-0 bottom-0 h-[70%] w-full" viewBox="0 0 1440 600" preserveAspectRatio="none">
        <path d="M0 330 C 220 230, 380 280, 560 220 S 900 150, 1080 230 S 1330 260, 1440 210 V600 H0Z" fill="#59745a" opacity="0.75" />
        <path d="M0 400 C 260 320, 420 380, 640 330 S 1010 300, 1220 360 S 1380 380, 1440 350 V600 H0Z" fill="#3b5f43" />
        <path d="M0 480 C 300 430, 520 470, 760 440 S 1180 420, 1440 455 V600 H0Z" fill="#244530" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/45" />
    </div>
  );
}
