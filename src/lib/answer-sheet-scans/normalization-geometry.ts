import {
  PAGE,
  REGISTRATION_MARKER_SIZE,
  getAnswerGridGeometry,
} from "@/lib/answer-sheet-pdf/layout";
import { SCAN_RENDER_SCALE } from "@/lib/answer-sheet-scans/rasterize";

export type Point = {
  x: number;
  y: number;
};

export type RegistrationMarkers = {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
};

export const NORMALIZED_PAGE_WIDTH = Math.ceil(PAGE.width * SCAN_RENDER_SCALE);
export const NORMALIZED_PAGE_HEIGHT = Math.ceil(PAGE.height * SCAN_RENDER_SCALE);
export const NORMALIZED_MARKER_SIZE =
  REGISTRATION_MARKER_SIZE * SCAN_RENDER_SCALE;
export const MARKER_RESIDUAL_TOLERANCE_PX = 3.5;

function scalePoint(point: Point): Point {
  return {
    x: point.x * SCAN_RENDER_SCALE,
    y: point.y * SCAN_RENDER_SCALE,
  };
}

const markerGeometry = getAnswerGridGeometry(1);

export const CANONICAL_MARKERS: RegistrationMarkers = {
  topLeft: scalePoint({
    x:
      markerGeometry.markerCoordinates.topLeft.x +
      markerGeometry.registrationMarkerSize / 2,
    y:
      markerGeometry.markerCoordinates.topLeft.y +
      markerGeometry.registrationMarkerSize / 2,
  }),
  topRight: scalePoint({
    x:
      markerGeometry.markerCoordinates.topRight.x +
      markerGeometry.registrationMarkerSize / 2,
    y:
      markerGeometry.markerCoordinates.topRight.y +
      markerGeometry.registrationMarkerSize / 2,
  }),
  bottomLeft: scalePoint({
    x:
      markerGeometry.markerCoordinates.bottomLeft.x +
      markerGeometry.registrationMarkerSize / 2,
    y:
      markerGeometry.markerCoordinates.bottomLeft.y +
      markerGeometry.registrationMarkerSize / 2,
  }),
  bottomRight: scalePoint({
    x:
      markerGeometry.markerCoordinates.bottomRight.x +
      markerGeometry.registrationMarkerSize / 2,
    y:
      markerGeometry.markerCoordinates.bottomRight.y +
      markerGeometry.registrationMarkerSize / 2,
  }),
};

export function markerArray(markers: RegistrationMarkers) {
  return [
    markers.topLeft,
    markers.topRight,
    markers.bottomRight,
    markers.bottomLeft,
  ];
}

export function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function polygonArea(points: Point[]) {
  let sum = 0;

  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) / 2;
}

export function estimateRotationDegrees(markers: RegistrationMarkers) {
  const topAngle = Math.atan2(
    markers.topRight.y - markers.topLeft.y,
    markers.topRight.x - markers.topLeft.x
  );
  const bottomAngle = Math.atan2(
    markers.bottomRight.y - markers.bottomLeft.y,
    markers.bottomRight.x - markers.bottomLeft.x
  );

  return (((topAngle + bottomAngle) / 2) * 180) / Math.PI;
}
