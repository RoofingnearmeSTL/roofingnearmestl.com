import Image from "next/image";

// Real photo from one of our hail inspections (GPS/EXIF removed), darkened so white text stays readable.
export default function HeroBackground() {
  return (
    <>
      <Image src="/images/hero-hail-inspection.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/75 to-black/85 lg:bg-gradient-to-r lg:from-black/90 lg:via-black/75 lg:to-black/55" />
      <p className="absolute bottom-2 right-4 text-[11px] text-white/60">Real photo: hail hit marked during one of our inspections</p>
    </>
  );
}
