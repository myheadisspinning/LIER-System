const ZOOM = 17;
const TILE_SIZE = 256;
const W = 160;
const H = 80;

function tileInfo(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const worldSize = TILE_SIZE * n;
  const x = ((lng + 180) / 360) * worldSize;
  const latRad = (lat * Math.PI) / 180;
  const y = (0.5 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / (2 * Math.PI)) * worldSize;
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  return {
    tileX,
    tileY,
    dx: Math.round(x - tileX * TILE_SIZE),
    dy: Math.round(y - tileY * TILE_SIZE),
  };
}

function tileUrl(tileX: number, tileY: number) {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${tileY}/${tileX}`;
}

interface StreetViewPreviewProps {
  lat: number | null;
  lng: number | null;
  open: boolean;
}

export default function StreetViewPreview({ lat, lng, open }: StreetViewPreviewProps) {
  if (!open || lat == null || lng == null) return null;

  const { tileX, tileY, dx, dy } = tileInfo(lat, lng, ZOOM);

  const tiles = [];
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      tiles.push(
        <img
          key={`${ox}-${oy}`}
          src={tileUrl(tileX + ox, tileY + oy)}
          alt=""
          loading="lazy"
          className="absolute select-none pointer-events-none"
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE,
            left: W / 2 - dx + ox * TILE_SIZE,
            top: H / 2 - dy + oy * TILE_SIZE,
          }}
        />,
      );
    }
  }

  const mapsUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-3 left-3 z-[500] block rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#1c2541]"
    >
      <div className="relative overflow-hidden bg-[#0f1b38]" style={{ width: W, height: H }}>
        {tiles}
      </div>
    </a>
  );
}