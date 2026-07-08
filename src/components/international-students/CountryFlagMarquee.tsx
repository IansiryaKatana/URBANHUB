import { NG, IN, CN, PK, GH, KE, BD, LK, MY, SA, AE, NP, ZW, FR, IT, TR, ET, UG, VN, KR } from "country-flag-icons/react/3x2";

const COUNTRIES = [
  { code: "NG", name: "Nigeria", Flag: NG },
  { code: "IN", name: "India", Flag: IN },
  { code: "CN", name: "China", Flag: CN },
  { code: "PK", name: "Pakistan", Flag: PK },
  { code: "GH", name: "Ghana", Flag: GH },
  { code: "KE", name: "Kenya", Flag: KE },
  { code: "BD", name: "Bangladesh", Flag: BD },
  { code: "LK", name: "Sri Lanka", Flag: LK },
  { code: "MY", name: "Malaysia", Flag: MY },
  { code: "SA", name: "Saudi Arabia", Flag: SA },
  { code: "AE", name: "UAE", Flag: AE },
  { code: "NP", name: "Nepal", Flag: NP },
  { code: "ZW", name: "Zimbabwe", Flag: ZW },
  { code: "FR", name: "France", Flag: FR },
  { code: "IT", name: "Italy", Flag: IT },
  { code: "TR", name: "Turkey", Flag: TR },
  { code: "ET", name: "Ethiopia", Flag: ET },
  { code: "UG", name: "Uganda", Flag: UG },
  { code: "VN", name: "Vietnam", Flag: VN },
  { code: "KR", name: "South Korea", Flag: KR },
] as const;

function CountryChip({
  name,
  Flag,
}: {
  name: string;
  Flag: React.ComponentType<{ title?: string; className?: string }>;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
      <Flag title={name} className="h-4 w-6 rounded-[2px] object-cover shadow-sm" />
      <span>{name}</span>
    </span>
  );
}

export function CountryFlagMarquee() {
  const loop = [...COUNTRIES, ...COUNTRIES];

  return (
    <div className="intl-flag-marquee relative overflow-hidden" aria-label="Students from 50 or more countries">
      <style>{`
        @keyframes intl-flag-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .intl-flag-marquee__track {
          display: flex;
          width: max-content;
          gap: 1.75rem;
          animation: intl-flag-marquee-scroll 45s linear infinite;
        }
        .intl-flag-marquee:hover .intl-flag-marquee__track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .intl-flag-marquee__track {
            animation: none;
            flex-wrap: wrap;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div className="intl-flag-marquee__track" aria-hidden="true">
        {loop.map((c, i) => (
          <CountryChip key={`${c.code}-${i}`} name={c.name} Flag={c.Flag} />
        ))}
      </div>
      <ul className="sr-only">
        {COUNTRIES.map((c) => (
          <li key={c.code}>{c.name}</li>
        ))}
      </ul>
    </div>
  );
}
