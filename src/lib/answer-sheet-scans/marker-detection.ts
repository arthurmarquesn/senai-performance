import type { ImageData } from "@napi-rs/canvas";

import {
  CANONICAL_MARKERS,
  NORMALIZED_MARKER_SIZE,
  NORMALIZED_PAGE_HEIGHT,
  NORMALIZED_PAGE_WIDTH,
  type Point,
  type RegistrationMarkers,
  distance,
  markerArray,
  polygonArea,
} from "@/lib/answer-sheet-scans/normalization-geometry";

/*
 * ================================================================
 * DETECÇÃO DOS MARCADORES DE REGISTRO
 * ================================================================
 *
 * O detector precisa funcionar tanto com:
 *
 * - PDF original;
 * - scanner;
 * - fotografia convertida para PDF;
 * - CamScanner;
 * - pequenas diferenças de escala;
 * - perspectiva;
 * - marcadores parcialmente clareados.
 *
 * Não podemos procurar apenas pelo objeto "mais preto", porque
 * respostas preenchidas também são regiões extremamente escuras.
 * ================================================================
 */

/*
 * 160 é propositalmente mais tolerante que o valor antigo (80).
 *
 * Scanners móveis frequentemente transformam preto em cinza.
 */
const DARK_THRESHOLD = 160;

/*
 * Mantemos uma área ampla para tolerar:
 *
 * - perspectiva;
 * - deslocamento;
 * - enquadramento;
 * - pequenas alterações de escala.
 */
const SEARCH_RADIUS_X =
  NORMALIZED_PAGE_WIDTH * 0.14;

const SEARCH_RADIUS_Y =
  NORMALIZED_PAGE_HEIGHT * 0.14;

const SEARCH_STEP_PX = 2;

/*
 * O marcador pode chegar maior ou menor após a digitalização.
 *
 * Em vez de procurar uma janela de tamanho único, procuramos
 * em múltiplas escalas.
 */
const MARKER_WINDOW_SCALES = [
  0.65,
  0.8,
  0.95,
  1.1,
] as const;

/*
 * Com múltiplas escalas podemos reduzir um pouco o mínimo de
 * preenchimento sem aceitar simplesmente qualquer texto.
 */
const MIN_DARK_FILL_RATIO = 0.45;

const MIN_QUAD_AREA_RATIO = 0.28;

/*
 * Peso dado à distância em relação à posição esperada.
 *
 * Essa é a principal proteção contra uma bolha preenchida
 * "roubar" a posição do marcador.
 */
const DISTANCE_PENALTY = 0.55;

/*
 * Pequena preferência por escalas próximas do tamanho esperado.
 */
const SCALE_PENALTY = 0.04;

export type MarkerDetectionResult = {
  markers: RegistrationMarkers;
  residualAverage: number;
  residualMax: number;
};

type IntegralImage = {
  integral: Uint32Array;
  width: number;
  height: number;
};

type MarkerCandidate = {
  center: Point;
  fillRatio: number;
  expectedDistance: number;
  normalizedDistance: number;
  scale: number;
  score: number;
};

class MarkerDetectionError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "MarkerDetectionError";
  }
}

export class MarkerNotFoundError extends MarkerDetectionError {}

export class InvalidMarkerGeometryError extends MarkerDetectionError {}

function isDark(
  imageData: ImageData,
  x: number,
  y: number
) {
  const index =
    (y * imageData.width + x) * 4;

  const red =
    imageData.data[index];

  const green =
    imageData.data[index + 1];

  const blue =
    imageData.data[index + 2];

  const intensity =
    (red + green + blue) / 3;

  return intensity <= DARK_THRESHOLD;
}

function buildIntegralImage(
  imageData: ImageData
): IntegralImage {
  const width =
    imageData.width;

  const height =
    imageData.height;

  const integral =
    new Uint32Array(
      (width + 1) *
        (height + 1)
    );

  for (
    let y = 1;
    y <= height;
    y++
  ) {
    let rowSum = 0;

    for (
      let x = 1;
      x <= width;
      x++
    ) {
      if (
        isDark(
          imageData,
          x - 1,
          y - 1
        )
      ) {
        rowSum++;
      }

      integral[
        y * (width + 1) + x
      ] =
        integral[
          (y - 1) *
            (width + 1) +
            x
        ] + rowSum;
    }
  }

  return {
    integral,
    width,
    height,
  };
}

function getDarkCount({
  integral,
  imageWidth,
  left,
  top,
  right,
  bottom,
}: {
  integral: Uint32Array;
  imageWidth: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}) {
  const stride =
    imageWidth + 1;

  return (
    integral[
      bottom * stride +
        right
    ] -
    integral[
      top * stride +
        right
    ] -
    integral[
      bottom * stride +
        left
    ] +
    integral[
      top * stride +
        left
    ]
  );
}

function calculateCandidateScore({
  fillRatio,
  normalizedDistance,
  scale,
}: {
  fillRatio: number;
  normalizedDistance: number;
  scale: number;
}) {
  /*
   * Quanto maior o fillRatio, melhor.
   *
   * Quanto mais longe da posição esperada, pior.
   *
   * Também existe uma penalidade muito pequena para escalas
   * muito diferentes do tamanho nominal.
   */
  return (
    fillRatio -
    normalizedDistance *
      DISTANCE_PENALTY -
    Math.abs(scale - 0.85) *
      SCALE_PENALTY
  );
}

function findMarkerNear({
  expected,
  integral,
  width,
  height,
}: {
  expected: Point;
  integral: Uint32Array;
  width: number;
  height: number;
}) {
  let best:
    | MarkerCandidate
    | null = null;

  /*
   * Tentamos mais de um tamanho.
   *
   * Isso é importante porque o CamScanner pode alterar
   * perceptivelmente o tamanho aparente do quadrado.
   */
  for (
    const scale of
    MARKER_WINDOW_SCALES
  ) {
    const markerWindowSize =
      Math.max(
        8,
        Math.round(
          NORMALIZED_MARKER_SIZE *
            scale
        )
      );

    const halfWindow =
      Math.floor(
        markerWindowSize / 2
      );

    const left =
      Math.max(
        halfWindow,
        Math.floor(
          expected.x -
            SEARCH_RADIUS_X
        )
      );

    const right =
      Math.min(
        width - halfWindow,
        Math.ceil(
          expected.x +
            SEARCH_RADIUS_X
        )
      );

    const top =
      Math.max(
        halfWindow,
        Math.floor(
          expected.y -
            SEARCH_RADIUS_Y
        )
      );

    const bottom =
      Math.min(
        height - halfWindow,
        Math.ceil(
          expected.y +
            SEARCH_RADIUS_Y
        )
      );

    for (
      let y = top;
      y <= bottom;
      y += SEARCH_STEP_PX
    ) {
      for (
        let x = left;
        x <= right;
        x += SEARCH_STEP_PX
      ) {
        const windowLeft =
          x - halfWindow;

        const windowTop =
          y - halfWindow;

        const windowRight =
          x + halfWindow;

        const windowBottom =
          y + halfWindow;

        const darkCount =
          getDarkCount({
            integral,
            imageWidth:
              width,
            left:
              windowLeft,
            top:
              windowTop,
            right:
              windowRight,
            bottom:
              windowBottom,
          });

        const area =
          (windowRight -
            windowLeft) *
          (windowBottom -
            windowTop);

        if (area <= 0) {
          continue;
        }

        const fillRatio =
          darkCount / area;

        if (
          fillRatio <
          MIN_DARK_FILL_RATIO
        ) {
          continue;
        }

        const expectedDistance =
          distance(
            { x, y },
            expected
          );

        /*
         * Distância normalizada pela área máxima de busca.
         *
         * Assim o peso da distância continua coerente mesmo que
         * a resolução de rasterização seja alterada futuramente.
         */
        const normalizedDistance =
          Math.hypot(
            (x - expected.x) /
              SEARCH_RADIUS_X,
            (y - expected.y) /
              SEARCH_RADIUS_Y
          );

        const score =
          calculateCandidateScore({
            fillRatio,
            normalizedDistance,
            scale,
          });

        if (
          !best ||
          score > best.score
        ) {
          best = {
            center: {
              x,
              y,
            },

            fillRatio,
            expectedDistance,
            normalizedDistance,
            scale,
            score,
          };
        }
      }
    }
  }

  return best?.center ?? null;
}

function validateMarkers(
  markers: RegistrationMarkers
) {
  const points =
    markerArray(markers);

  const area =
    polygonArea(points);

  const minArea =
    NORMALIZED_PAGE_WIDTH *
    NORMALIZED_PAGE_HEIGHT *
    MIN_QUAD_AREA_RATIO;

  if (area < minArea) {
    throw new InvalidMarkerGeometryError(
      "Área dos marcadores incompatível."
    );
  }

  const topWidth =
    distance(
      markers.topLeft,
      markers.topRight
    );

  const bottomWidth =
    distance(
      markers.bottomLeft,
      markers.bottomRight
    );

  const leftHeight =
    distance(
      markers.topLeft,
      markers.bottomLeft
    );

  const rightHeight =
    distance(
      markers.topRight,
      markers.bottomRight
    );

  const minExpectedWidth =
    NORMALIZED_PAGE_WIDTH *
    0.6;

  const minExpectedHeight =
    NORMALIZED_PAGE_HEIGHT *
    0.45;

  if (
    topWidth <
      minExpectedWidth ||
    bottomWidth <
      minExpectedWidth ||
    leftHeight <
      minExpectedHeight ||
    rightHeight <
      minExpectedHeight
  ) {
    throw new InvalidMarkerGeometryError(
      "Distância entre marcadores incompatível."
    );
  }

  const horizontalRatio =
    Math.min(
      topWidth,
      bottomWidth
    ) /
    Math.max(
      topWidth,
      bottomWidth
    );

  const verticalRatio =
    Math.min(
      leftHeight,
      rightHeight
    ) /
    Math.max(
      leftHeight,
      rightHeight
    );

  if (
    horizontalRatio < 0.75 ||
    verticalRatio < 0.75
  ) {
    throw new InvalidMarkerGeometryError(
      "Marcadores não formam uma grade coerente."
    );
  }
}

export function detectRegistrationMarkers(
  imageData: ImageData
): MarkerDetectionResult {
  const {
    integral,
    width,
    height,
  } =
    buildIntegralImage(
      imageData
    );

  const topLeft =
    findMarkerNear({
      expected:
        CANONICAL_MARKERS.topLeft,
      integral,
      width,
      height,
    });

  const topRight =
    findMarkerNear({
      expected:
        CANONICAL_MARKERS.topRight,
      integral,
      width,
      height,
    });

  const bottomLeft =
    findMarkerNear({
      expected:
        CANONICAL_MARKERS.bottomLeft,
      integral,
      width,
      height,
    });

  const bottomRight =
    findMarkerNear({
      expected:
        CANONICAL_MARKERS.bottomRight,
      integral,
      width,
      height,
    });

  if (
    !topLeft ||
    !topRight ||
    !bottomLeft ||
    !bottomRight
  ) {
    throw new MarkerNotFoundError(
      "Não foi possível localizar os quatro marcadores."
    );
  }

  const markers: RegistrationMarkers =
    {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    };

  validateMarkers(markers);

  const detectedArray =
    markerArray(markers);

  const canonicalArray =
    markerArray(
      CANONICAL_MARKERS
    );

  const residuals =
    detectedArray.map(
      (point, index) =>
        distance(
          point,
          canonicalArray[index]
        )
    );

  return {
    markers,

    residualAverage:
      residuals.reduce(
        (
          sum,
          residual
        ) =>
          sum +
          residual,
        0
      ) /
      residuals.length,

    residualMax:
      Math.max(
        ...residuals
      ),
  };
}