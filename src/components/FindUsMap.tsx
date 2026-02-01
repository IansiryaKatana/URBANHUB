import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Clock, Navigation, Building2, ShoppingBag, Dumbbell, UtensilsCrossed, GraduationCap } from "lucide-react";
import { AnimatedHeading, AnimatedText } from "./animations/AnimatedText";
import TypingTitle from "./TypingTitle";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Urban Hub Preston coordinates
const URBAN_HUB_POSITION: [number, number] = [53.7594, -2.7025];

// Nearby locations with coordinates
const locations = {
  urbanHub: {
    name: "Urban Hub Preston",
    position: URBAN_HUB_POSITION,
    icon: "🏠",
    color: "#ff2020",
  },
  uclan: {
    name: "University of Central Lancashire (UCLan)",
    position: [53.7631, -2.7075] as [number, number],
    icon: "🎓",
    color: "#0066cc",
    walkingTime: "5 min",
    distance: "0.4 km",
  },
  tesco: {
    name: "Tesco Express",
    position: [53.7598, -2.7018] as [number, number],
    icon: "🛒",
    color: "#0066cc",
    walkingTime: "2 min",
    distance: "0.1 km",
  },
  pureGym: {
    name: "PureGym Preston",
    position: [53.7602, -2.7035] as [number, number],
    icon: "💪",
    color: "#0066cc",
    walkingTime: "3 min",
    distance: "0.2 km",
  },
  cityCentre: {
    name: "Preston City Centre",
    position: [53.7614, -2.7075] as [number, number],
    icon: "🏙️",
    color: "#0066cc",
    walkingTime: "8 min",
    distance: "0.6 km",
  },
  redRoseBowl: {
    name: "Red Rose Bowl",
    position: [53.7575, -2.6950] as [number, number],
    icon: "🎳",
    color: "#0066cc",
    walkingTime: "10 min",
    distance: "0.8 km",
  },
};

// Create custom icons
const createCustomIcon = (color: string, icon: string) => {
  return L.divIcon({
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
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        ${icon}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

// Calculate walking route (simplified - straight line for demo)
const calculateRoute = (from: [number, number], to: [number, number]) => {
  // Simple straight line route (in production, use a routing service)
  return [from, to];
};

const FindUsMap = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setMapLoaded(true);
  }, []);

  const routeToUCLan = calculateRoute(URBAN_HUB_POSITION, locations.uclan.position);

  return (
    <section className="w-full bg-white p-[10px]">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <AnimatedText delay={0.1}>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-4">
              Discover Your Location
            </p>
          </AnimatedText>
          <TypingTitle
            as="h2"
            text="Find Us"
            className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight leading-none text-black mb-6"
            typingSpeed={30}
          />
          <AnimatedText delay={0.2}>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Located in the heart of Preston, Urban Hub is perfectly positioned for student life. 
              Everything you need is just minutes away.
            </p>
          </AnimatedText>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Location Cards */}
          <div className="lg:col-span-1 space-y-4">
            {/* Urban Hub Card */}
            <div className="bg-[#ff2020] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-black text-xl uppercase mb-2">Urban Hub</h3>
                  <p className="text-white/90 text-sm mb-3">Your Home Base</p>
                  <p className="text-white/80 text-xs">53.7594°N, 2.7025°W</p>
                </div>
              </div>
            </div>

            {/* Nearby Locations */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Nearby Amenities
              </h4>
              
              {Object.entries(locations)
                .filter(([key]) => key !== "urbanHub")
                .map(([key, location]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedLocation(key)}
                    className={`w-full text-left bg-white border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-lg ${
                      selectedLocation === key
                        ? "border-[#ff2020] shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{location.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm md:text-base mb-1 truncate">
                          {location.name}
                        </h5>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {location.walkingTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{location.walkingTime} walk</span>
                            </div>
                          )}
                          {location.distance && (
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              <span>{location.distance}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mt-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Quick Stats
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#ff2020]" />
                    <span className="text-sm text-muted-foreground">To UCLan</span>
                  </div>
                  <span className="font-bold text-sm">5 min walk</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[#ff2020]" />
                    <span className="text-sm text-muted-foreground">To Tesco</span>
                  </div>
                  <span className="font-bold text-sm">2 min walk</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-[#ff2020]" />
                    <span className="text-sm text-muted-foreground">To PureGym</span>
                  </div>
                  <span className="font-bold text-sm">3 min walk</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#ff2020]" />
                    <span className="text-sm text-muted-foreground">To City Centre</span>
                  </div>
                  <span className="font-bold text-sm">8 min walk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-200 h-[500px] md:h-[600px] lg:h-[700px]">
              {mapLoaded && (
                <MapContainer
                  center={URBAN_HUB_POSITION}
                  zoom={15}
                  style={{ height: "100%", width: "100%", zIndex: 1 }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Walking route to UCLan */}
                  <Polyline
                    positions={routeToUCLan}
                    pathOptions={{
                      color: "#ff2020",
                      weight: 4,
                      opacity: 0.8,
                      dashArray: "10, 10",
                    }}
                  />

                  {/* Circle showing proximity area */}
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

                  {/* Urban Hub Marker */}
                  <Marker
                    position={URBAN_HUB_POSITION}
                    icon={createCustomIcon(locations.urbanHub.color, locations.urbanHub.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-1">{locations.urbanHub.name}</h3>
                        <p className="text-sm text-muted-foreground">Your student accommodation</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* UCLan Marker */}
                  <Marker
                    position={locations.uclan.position}
                    icon={createCustomIcon(locations.uclan.color, locations.uclan.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-1">{locations.uclan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {locations.uclan.walkingTime} walk • {locations.uclan.distance}
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Tesco Marker */}
                  <Marker
                    position={locations.tesco.position}
                    icon={createCustomIcon(locations.tesco.color, locations.tesco.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-1">{locations.tesco.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {locations.tesco.walkingTime} walk • {locations.tesco.distance}
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* PureGym Marker */}
                  <Marker
                    position={locations.pureGym.position}
                    icon={createCustomIcon(locations.pureGym.color, locations.pureGym.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-1">{locations.pureGym.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {locations.pureGym.walkingTime} walk • {locations.pureGym.distance}
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* City Centre Marker */}
                  <Marker
                    position={locations.cityCentre.position}
                    icon={createCustomIcon(locations.cityCentre.color, locations.cityCentre.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-1">{locations.cityCentre.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {locations.cityCentre.walkingTime} walk • {locations.cityCentre.distance}
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Red Rose Bowl Marker */}
                  <Marker
                    position={locations.redRoseBowl.position}
                    icon={createCustomIcon(locations.redRoseBowl.color, locations.redRoseBowl.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-1">{locations.redRoseBowl.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {locations.redRoseBowl.walkingTime} walk • {locations.redRoseBowl.distance}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              )}
            </div>

            {/* Map Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#ff2020] border-2 border-white shadow-sm"></div>
                <span>Urban Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0066cc] border-2 border-white shadow-sm"></div>
                <span>Nearby Locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-[#ff2020] opacity-60"></div>
                <span>Walking Route to UCLan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FindUsMap;
