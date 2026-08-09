import type { ImageData } from "@napi-rs/canvas";

import {
  NORMALIZED_PAGE_HEIGHT,
  NORMALIZED_PAGE_WIDTH,
  type Point,
} from "@/lib/answer-sheet-scans/normalization-geometry";

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < size; pivot++) {
    let pivotRow = pivot;

    for (let row = pivot + 1; row < size; row++) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[pivotRow][pivot])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][pivot]) < 1e-9) {
      throw new Error("Transformação geométrica degenerada.");
    }

    [augmented[pivot], augmented[pivotRow]] = [
      augmented[pivotRow],
      augmented[pivot],
    ];

    const pivotValue = augmented[pivot][pivot];

    for (let column = pivot; column <= size; column++) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row++) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];

      for (let column = pivot; column <= size; column++) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

export function computeHomography(source: Point[], destination: Point[]) {
  if (source.length !== 4 || destination.length !== 4) {
    throw new Error("A homografia exige quatro pontos de origem e destino.");
  }

  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let index = 0; index < 4; index++) {
    const { x, y } = source[index];
    const { x: u, y: v } = destination[index];

    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    vector.push(v);
  }

  const [a, b, c, d, e, f, g, h] = solveLinearSystem(matrix, vector);

  return [a, b, c, d, e, f, g, h, 1] as const;
}

function sampleBilinear(imageData: ImageData, x: number, y: number, channel: number) {
  const maxX = imageData.width - 1;
  const maxY = imageData.height - 1;

  if (x < 0 || y < 0 || x > maxX || y > maxY) {
    return 255;
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(maxX, x0 + 1);
  const y1 = Math.min(maxY, y0 + 1);
  const dx = x - x0;
  const dy = y - y0;
  const topLeft = imageData.data[(y0 * imageData.width + x0) * 4 + channel];
  const topRight = imageData.data[(y0 * imageData.width + x1) * 4 + channel];
  const bottomLeft = imageData.data[(y1 * imageData.width + x0) * 4 + channel];
  const bottomRight = imageData.data[(y1 * imageData.width + x1) * 4 + channel];
  const top = topLeft * (1 - dx) + topRight * dx;
  const bottom = bottomLeft * (1 - dx) + bottomRight * dx;

  return Math.round(top * (1 - dy) + bottom * dy);
}

export function warpPerspective({
  source,
  destinationToSource,
}: {
  source: ImageData;
  destinationToSource: readonly number[];
}) {
  const output = new Uint8ClampedArray(
    NORMALIZED_PAGE_WIDTH * NORMALIZED_PAGE_HEIGHT * 4
  );
  const [a, b, c, d, e, f, g, h] = destinationToSource;

  for (let y = 0; y < NORMALIZED_PAGE_HEIGHT; y++) {
    for (let x = 0; x < NORMALIZED_PAGE_WIDTH; x++) {
      const denominator = g * x + h * y + 1;
      const sourceX = (a * x + b * y + c) / denominator;
      const sourceY = (d * x + e * y + f) / denominator;
      const outputIndex = (y * NORMALIZED_PAGE_WIDTH + x) * 4;

      output[outputIndex] = sampleBilinear(source, sourceX, sourceY, 0);
      output[outputIndex + 1] = sampleBilinear(source, sourceX, sourceY, 1);
      output[outputIndex + 2] = sampleBilinear(source, sourceX, sourceY, 2);
      output[outputIndex + 3] = sampleBilinear(source, sourceX, sourceY, 3);
    }
  }

  return {
    data: output,
    width: NORMALIZED_PAGE_WIDTH,
    height: NORMALIZED_PAGE_HEIGHT,
  };
}
