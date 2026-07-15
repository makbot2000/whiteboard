export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapDelta {
  x: number;
  y: number;
}

function rangesAreNear(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  threshold: number,
) {
  return startA <= endB + threshold && startB <= endA + threshold;
}

function closestCorrection(corrections: number[], threshold: number) {
  return corrections.reduce<number>((closest, correction) => {
    if (Math.abs(correction) > threshold) return closest;
    return Math.abs(correction) < Math.abs(closest) ? correction : closest;
  }, Infinity);
}

export function getSnapDelta(
  moving: SnapRect,
  targets: SnapRect[],
  threshold: number,
): SnapDelta {
  const movingRight = moving.x + moving.width;
  const movingBottom = moving.y + moving.height;
  const movingCenterX = moving.x + moving.width / 2;
  const movingCenterY = moving.y + moving.height / 2;
  const xCorrections: number[] = [];
  const yCorrections: number[] = [];

  for (const target of targets) {
    const targetRight = target.x + target.width;
    const targetBottom = target.y + target.height;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    if (rangesAreNear(moving.y, movingBottom, target.y, targetBottom, threshold)) {
      xCorrections.push(
        target.x - moving.x,
        targetRight - movingRight,
        targetCenterX - movingCenterX,
        targetRight - moving.x,
        target.x - movingRight,
      );
    }

    if (rangesAreNear(moving.x, movingRight, target.x, targetRight, threshold)) {
      yCorrections.push(
        target.y - moving.y,
        targetBottom - movingBottom,
        targetCenterY - movingCenterY,
        targetBottom - moving.y,
        target.y - movingBottom,
      );
    }
  }

  const x = closestCorrection(xCorrections, threshold);
  const y = closestCorrection(yCorrections, threshold);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}
