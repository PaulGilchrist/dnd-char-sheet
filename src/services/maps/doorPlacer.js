/**
 * Door Placer - Finds door positions, places doors and secret doors
 *
 * Handles:
 * - Finding corridor spans adjacent to room edges
 * - Determining door positions within spans
 * - Placing regular and secret doors
 * - Deduplicating and pairing doors
 */

export function placeDoors(rooms, gridSize, rng, corridorCells, grid) {
  const finalDoors = [];

  for (let r = 0; r < rooms.length; r++) {
    const room = rooms[r];
    const spans = findRoomDoorSpans(room, gridSize, corridorCells);

    for (let s = 0; s < spans.length; s++) {
      const span = spans[s];
      const isNorthSouth = span.side === 'n' || span.side === 's';
      const spanWidth = isNorthSouth ? span.x2 - span.x1 + 1 : span.y2 - span.y1 + 1;

      const positions = [];
      if (spanWidth === 1) {
        const pos = spanCenter(span);
        positions.push({ x: pos.x, y: pos.y });
      }

      for (let pi = 0; pi < positions.length; pi++) {
        const pos = positions[pi];

        if (positions.length === 1) {
          const hasWallNeighbor =
            (pos.x > 0 && grid[pos.y][pos.x - 1]) ||
            (pos.x < gridSize - 1 && grid[pos.y][pos.x + 1]) ||
            (pos.y > 0 && grid[pos.y - 1][pos.x]) ||
            (pos.y < gridSize - 1 && grid[pos.y + 1][pos.x]);
          if (!hasWallNeighbor) continue;
        }

        const rotation = isNorthSouth ? 90 : 0;

        let doorType;
        if (positions.length > 1) {
          doorType = 'door';
        } else {
          const secretRoll = rng();
          if (room._deadEndCap) {
            doorType = secretRoll < 0.3 ? 'secretDoor' : 'door';
          } else {
            doorType = secretRoll < 0.1 ? 'secretDoor' : 'door';
          }
        }

        finalDoors.push({
          x: pos.x,
          y: pos.y,
          rotation: rotation,
          doorType: doorType,
        });
      }
    }
  }

  // Deduplicate doors by position
  const seenDoorPos = {};
  const uniqueDoors = [];
  for (let d = 0; d < finalDoors.length; d++) {
    const key = finalDoors[d].x + ',' + finalDoors[d].y;
    if (!seenDoorPos[key]) {
      seenDoorPos[key] = true;
      uniqueDoors.push(finalDoors[d]);
    }
  }

  // Remove adjacent duplicate doors
  const doorPosSet2 = {};
  for (const d of uniqueDoors) {
    doorPosSet2[d.x + ',' + d.y] = d;
  }
  const toRemoveAdj = new Set();
  for (const d of uniqueDoors) {
    if (toRemoveAdj.has(d.x + ',' + d.y)) continue;
    const rightKey = (d.x + 1) + ',' + d.y;
    if (doorPosSet2[rightKey] && !toRemoveAdj.has(rightKey)) {
      toRemoveAdj.add(rightKey);
    }
    const bottomKey = d.x + ',' + (d.y + 1);
    if (doorPosSet2[bottomKey] && !toRemoveAdj.has(bottomKey)) {
      toRemoveAdj.add(bottomKey);
    }
  }
  const trimmedDoors = uniqueDoors.filter(d => !toRemoveAdj.has(d.x + ',' + d.y));

  return { trimmedDoors };
}

function findRoomDoorSpans(room, gridSize, corridorCells) {
  const spans = [];
  const ny = room.rect.y - 1;
  let spanStart = null;
  for (let x = room.rect.x; x < room.rect.x + room.rect.w; x++) {
    if (corridorCells[x + ',' + ny]) {
      if (spanStart == null) spanStart = x;
    } else if (spanStart != null) {
      spans.push({ side: 'n', x1: spanStart, x2: x - 1, y: ny });
      spanStart = null;
    }
  }
  if (spanStart != null) spans.push({ side: 'n', x1: spanStart, x2: room.rect.x + room.rect.w - 1, y: ny });

  const sy = room.rect.y + room.rect.h;
  spanStart = null;
  for (let x = room.rect.x; x < room.rect.x + room.rect.w; x++) {
    if (corridorCells[x + ',' + sy]) {
      if (spanStart == null) spanStart = x;
    } else if (spanStart != null) {
      spans.push({ side: 's', x1: spanStart, x2: x - 1, y: sy });
      spanStart = null;
    }
  }
  if (spanStart != null) spans.push({ side: 's', x1: spanStart, x2: room.rect.x + room.rect.w - 1, y: sy });

  const wx = room.rect.x - 1;
  spanStart = null;
  for (let y = room.rect.y; y < room.rect.y + room.rect.h; y++) {
    if (corridorCells[wx + ',' + y]) {
      if (spanStart == null) spanStart = y;
    } else if (spanStart != null) {
      spans.push({ side: 'w', x: wx, y1: spanStart, y2: y - 1 });
      spanStart = null;
    }
  }
  if (spanStart != null) spans.push({ side: 'w', x: wx, y1: spanStart, y2: room.rect.y + room.rect.h - 1 });

  const ex = room.rect.x + room.rect.w;
  spanStart = null;
  for (let y = room.rect.y; y < room.rect.y + room.rect.h; y++) {
    if (corridorCells[ex + ',' + y]) {
      if (spanStart == null) spanStart = y;
    } else if (spanStart != null) {
      spans.push({ side: 'e', x: ex, y1: spanStart, y2: y - 1 });
      spanStart = null;
    }
  }
  if (spanStart != null) spans.push({ side: 'e', x: ex, y1: spanStart, y2: room.rect.y + room.rect.h - 1 });

  return spans;
}

function spanCenter(span) {
  if (span.side === 'n' || span.side === 's') {
    return { x: Math.floor((span.x1 + span.x2) / 2), y: span.y };
  }
  return { x: span.x, y: Math.floor((span.y1 + span.y2) / 2) };
}
