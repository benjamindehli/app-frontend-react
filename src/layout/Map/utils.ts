import { type GeoJSON } from 'geojson';
import { geoJson, LatLngBounds } from 'leaflet';
import WKT from 'terraformer-wkt-parser';
import type { LatLngExpression, PointExpression } from 'leaflet';

import type { IGeometryType, Location, MapLayer } from 'src/layout/Map/config.generated';
import type { Geometry, RawGeometry } from 'src/layout/Map/types';

// Default is center of Norway
export const DefaultCenterLocation: Location = {
  latitude: 64.888996,
  longitude: 12.8186054,
};
export const DefaultZoom = 4;
// Default zoom level that should be used when when flying to new markerLocation
export const DefaultFlyToZoomLevel = 16;
export const DefaultMapLayers: MapLayer[] = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  },
  {
    url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
    attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>',
  },
];
export const DefaultBoundsPadding: PointExpression = [50, 50];

export function parseLocation(locationString: string | undefined): Location | undefined {
  if (!locationString) {
    return undefined;
  }
  const latLonArray = locationString.split(',');
  if (latLonArray.length != 2) {
    window.logErrorOnce(`Invalid location string: ${locationString}`);
    return undefined;
  }
  const latString = latLonArray[0];
  const lonString = latLonArray[1];
  const lat = parseFloat(latString);
  const lon = parseFloat(lonString);
  if (isNaN(lat) || isNaN(lon)) {
    window.logErrorOnce(`Invalid location string: ${locationString}`);
    return undefined;
  }
  return {
    latitude: lat,
    longitude: lon,
  };
}

export function locationToTuple(location: Location): [number, number] {
  return [location.latitude, location.longitude];
}

export function isLocationValid(location: Location | undefined): location is Location {
  return typeof location?.latitude === 'number' && typeof location?.longitude === 'number';
}

/**
 * Center & Zoom / Bounds controls the starting view of the map in order of priority
 * 1. If a marker is set, center on that with zoom=16
 * 2. If geometries are present, use bounds to center on those
 * 3. If custom center and/or zoom is set, use that
 * 4. Else, use default center and zoom
 */
export function getMapStartingView(
  markerLocation: Location | undefined,
  customCenterLocation: Location | undefined,
  customZoom: number | undefined,
  geometryBounds: LatLngBounds | undefined,
): {
  center: LatLngExpression | undefined;
  zoom: number | undefined;
  bounds: LatLngBounds | undefined;
} {
  const markerLocationValid = isLocationValid(markerLocation);
  const centerLocationValid = isLocationValid(customCenterLocation);

  if (markerLocationValid) {
    return {
      center: locationToTuple(markerLocation),
      zoom: 16,
      bounds: undefined,
    };
  } else if (geometryBounds) {
    return {
      center: undefined,
      zoom: undefined,
      bounds: geometryBounds,
    };
  } else {
    return {
      center: centerLocationValid ? locationToTuple(customCenterLocation) : locationToTuple(DefaultCenterLocation),
      zoom: customZoom ?? DefaultZoom,
      bounds: undefined,
    };
  }
}

export function parseGeometries(
  geometries: RawGeometry[] | undefined,
  geometryType?: IGeometryType,
): Geometry[] | null {
  if (!geometries) {
    return null;
  }

  const out: Geometry[] = [];

  for (const { altinnRowId, data: rawData, label } of geometries) {
    if (geometryType === 'WKT') {
      const data = WKT.parse(rawData);
      out.push({
        altinnRowId,
        data,
        label,
      });
    } else {
      const data = JSON.parse(rawData) as GeoJSON;
      out.push({
        altinnRowId,
        data,
        label,
      });
    }
  }

  return out;
}

export function calculateBounds(geometries: Geometry[] | null): LatLngBounds | undefined {
  if (!geometries?.length) {
    return undefined;
  }

  const bounds: [[number, number], [number, number]] = geometries.reduce(
    (currentBounds, { data }) => {
      const bounds = geoJson(data).getBounds();
      currentBounds[0][0] = Math.min(bounds.getSouth(), currentBounds[0][0]);
      currentBounds[0][1] = Math.min(bounds.getWest(), currentBounds[0][1]);
      currentBounds[1][0] = Math.max(bounds.getNorth(), currentBounds[1][0]);
      currentBounds[1][1] = Math.max(bounds.getEast(), currentBounds[1][1]);
      return currentBounds;
    },
    [
      [90, 180],
      [-90, -180],
    ],
  );

  return new LatLngBounds(bounds);
}
