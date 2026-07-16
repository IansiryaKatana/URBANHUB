import { useEffect, useState, type ComponentType } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  Clock,
  Dumbbell,
  GraduationCap,
  Home,
  Navigation,
  ShoppingCart,
  Trophy,
  type LucideProps,
} from "lucide-react";
import { AnimatedText } from "./animations/AnimatedText";
import TypingTitle from "./TypingTitle";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const URBAN_HUB_POSITION: [number, number] = [53.7594, -2.7025];

type LucideIcon = ComponentType<LucideProps>;

type MapLocation = {
  name: string;
  position: [number, number];
  Icon: LucideIcon;
  markerSvg: string;
  color: string;
  walkingTime?: string;
  distance?: string;
};

const iconSvg = (paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const locations: Record<string, MapLocation> = {
  urbanHub: {
    name: "Urban Hub Preston",
    position: URBAN_HUB_POSITION,
    Icon: Home,
    markerSvg: iconSvg(
      `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    ),
    color: "#ff2020",
  },
  universityOfLancashire: {
    name: "University of Lancashire",
    position: [53.7631, -2.7075],
    Icon: GraduationCap,
    markerSvg: iconSvg(
      `<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>`,
    ),
    color: "#0066cc",
    walkingTime: "5 min",
    distance: "0.4 km",
  },
  tesco: {
    name: "Tesco Express",
    position: [53.7598, -2.7018],
    Icon: ShoppingCart,
    markerSvg: iconSvg(
      `<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`,
    ),
    color: "#0066cc",
    walkingTime: "2 min",
    distance: "0.1 km",
  },
  pureGym: {
    name: "PureGym Preston",
    position: [53.7602, -2.7035],
    Icon: Dumbbell,
    markerSvg: iconSvg(
      `<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>`,
    ),
    color: "#0066cc",
    walkingTime: "3 min",
    distance: "0.2 km",
  },
  cityCentre: {
    name: "Preston City Centre",
    position: [53.7614, -2.7075],
    Icon: Building2,
    markerSvg: iconSvg(
      `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`,
    ),
    color: "#0066cc",
    walkingTime: "8 min",
    distance: "0.6 km",
  },
  redRoseBowl: {
    name: "Red Rose Bowl",
    position: [53.7575, -2.695],
    Icon: Trophy,
    markerSvg: iconSvg(
      `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
    ),
    color: "#0066cc",
    walkingTime: "10 min",
    distance: "0.8 km",
  },
};

const createCustomIcon = (color: string, svg: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        ${svg}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

const calculateRoute = (from: [number, number], to: [number, number]) => [from, to];

const amenityEntries = Object.entries(locations).filter(([key]) => key !== "urbanHub");

function MapFlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.flyTo(position, 16, { duration: 0.8 });
  }, [map, position]);

  return null;
}

const FindUsMap = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setMapLoaded(true);
  }, []);

  const routeToUniversity = calculateRoute(URBAN_HUB_POSITION, locations.universityOfLancashire.position);
  const columnHeight = "h-[500px] md:h-[600px] lg:h-[700px]";
  const selectedPosition = selectedLocation ? locations[selectedLocation]?.position ?? null : null;

  return (
    <section className="w-full bg-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center md:mb-12">
          <AnimatedText delay={0.1}>
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Discover Your Location
            </p>
          </AnimatedText>
          <TypingTitle
            as="h2"
            text="Find Us"
            className="mb-6 font-display text-4xl font-black uppercase leading-none tracking-tight text-black md:text-6xl"
            typingSpeed={30}
          />
          <AnimatedText delay={0.2}>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
              Located in the heart of Preston, Urban Hub is perfectly positioned for student life. Everything you need
              is just minutes away.
            </p>
          </AnimatedText>
        </div>

        <div className="grid items-stretch gap-6 md:gap-8 lg:grid-cols-3">
          <div className={`lg:col-span-1 flex flex-col gap-4 ${columnHeight}`}>
            <div className="shrink-0 rounded-2xl bg-[#ff2020] px-5 py-4 text-white shadow-lg">
              <h3 className="font-display text-xl font-black uppercase tracking-wide">Urban Hub</h3>
              <p className="mt-1 text-xs text-white/80">53.7594°N, 2.7025°W</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <h4 className="mb-2 shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nearby Amenities
              </h4>

              <div className="min-h-0 flex-1 divide-y divide-zinc-200 overflow-y-auto border-y border-zinc-200">
                {amenityEntries.map(([key, location]) => {
                  const Icon = location.Icon;
                  const isSelected = selectedLocation === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedLocation(key)}
                      className={`flex w-full items-center gap-3 py-3.5 text-left transition-colors ${
                        isSelected ? "bg-red-50/60" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isSelected ? "bg-[#ff2020] text-white" : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5
                          className={`truncate text-sm font-semibold leading-snug ${
                            isSelected ? "text-[#ff2020]" : "text-foreground"
                          }`}
                        >
                          {location.name}
                        </h5>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {location.walkingTime && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {location.walkingTime} walk
                            </span>
                          )}
                          {location.distance && (
                            <span className="inline-flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {location.distance}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className={`overflow-hidden rounded-2xl border-2 border-gray-200 shadow-2xl ${columnHeight}`}>
              {mapLoaded && (
                <MapContainer
                  center={URBAN_HUB_POSITION}
                  zoom={15}
                  style={{ height: "100%", width: "100%", zIndex: 1 }}
                  scrollWheelZoom={true}
                >
                  <MapFlyTo position={selectedPosition} />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Polyline
                    positions={routeToUniversity}
                    pathOptions={{
                      color: "#ff2020",
                      weight: 4,
                      opacity: 0.8,
                      dashArray: "10, 10",
                    }}
                  />

                  <Circle
                    center={URBAN_HUB_POSITION}
                    radius={800}
                    pathOptions={{
                      color: "#ff2020",
                      fillColor: "#ff2020",
                      fillOpacity: 0.1,
                      weight: 2,
                    }}
                  />

                  {Object.entries(locations).map(([key, location]) => (
                    <Marker
                      key={key}
                      position={location.position}
                      icon={createCustomIcon(location.color, location.markerSvg)}
                      eventHandlers={{
                        click: () => {
                          if (key !== "urbanHub") setSelectedLocation(key);
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-center">
                          <h3 className="mb-1 text-lg font-bold">{location.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {key === "urbanHub"
                              ? "Your student accommodation"
                              : `${location.walkingTime} walk • ${location.distance}`}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-white bg-[#ff2020] shadow-sm" />
                <span>Urban Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-white bg-[#0066cc] shadow-sm" />
                <span>Nearby Locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-[#ff2020] opacity-60" />
                <span>Walking Route to University of Lancashire</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FindUsMap;
