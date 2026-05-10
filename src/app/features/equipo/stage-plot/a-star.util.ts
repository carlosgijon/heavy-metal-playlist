export function findOrthogonalPath(
  startX: number, startY: number, 
  endX: number, endY: number, 
  obstacles: {id?: string, x: number, y: number, w: number, h: number}[],
  excludeIds: string[] = []
): {x: number, y: number}[] {
  
  const GRID_SIZE = 20;
  
  const startNode = { x: Math.floor(startX / GRID_SIZE), y: Math.floor(startY / GRID_SIZE) };
  const endNode = { x: Math.floor(endX / GRID_SIZE), y: Math.floor(endY / GRID_SIZE) };

  const gridObstacles = new Set<string>();
  for (const obs of obstacles) {
      if (obs.id && excludeIds.includes(obs.id)) continue;
      
      // Dejamos un pequeño margen para que los cables no pasen rozando el borde del svg (opcional)
      const minX = Math.floor(obs.x / GRID_SIZE);
      const minY = Math.floor(obs.y / GRID_SIZE);
      const maxX = Math.floor((obs.x + obs.w) / GRID_SIZE);
      const maxY = Math.floor((obs.y + obs.h) / GRID_SIZE);
      
      for(let i = minX; i <= maxX; i++) {
          for(let j = minY; j <= maxY; j++) {
              gridObstacles.add(`${i},${j}`);
          }
      }
  }

  const openList: any[] = [];
  const closedList = new Set<string>();
  
  openList.push({ ...startNode, g: 0, h: heuristic(startNode, endNode), f: heuristic(startNode, endNode), parent: null });
  
  let iterations = 0;
  while(openList.length > 0 && iterations < 5000) {
      iterations++;
      
      let lowestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
          if (openList[i].f < openList[lowestIndex].f) {
              lowestIndex = i;
          }
      }
      const current = openList.splice(lowestIndex, 1)[0];
      
      const posKey = `${current.x},${current.y}`;
      if (current.x === endNode.x && current.y === endNode.y) {
          const path = [];
          let curr = current;
          while(curr) {
              path.push({ x: curr.x * GRID_SIZE + GRID_SIZE/2, y: curr.y * GRID_SIZE + GRID_SIZE/2 });
              curr = curr.parent;
          }
          // Fallback final: ajustar los extremos a los puntos exactos
          const finalPath = path.reverse();
          finalPath[0] = { x: startX, y: startY };
          finalPath[finalPath.length - 1] = { x: endX, y: endY };
          return simplifyPath(finalPath);
      }
      
      closedList.add(posKey);
      
      const neighbors = [
          { x: current.x, y: current.y - 1 },
          { x: current.x, y: current.y + 1 },
          { x: current.x - 1, y: current.y },
          { x: current.x + 1, y: current.y }
      ];
      
      for (const n of neighbors) {
          // Limites del escenario (suponiendo máx 3000px)
          if (n.x < 0 || n.y < 0 || n.x > 150 || n.y > 150) continue; 
          
          const nKey = `${n.x},${n.y}`;
          if (closedList.has(nKey)) continue;
          if (gridObstacles.has(nKey)) continue;
          
          // Coste extra para penalizar cambios de dirección (para cables más limpios)
          let turnPenalty = 0;
          if (current.parent) {
              const dx1 = current.x - current.parent.x;
              const dy1 = current.y - current.parent.y;
              const dx2 = n.x - current.x;
              const dy2 = n.y - current.y;
              if (dx1 !== dx2 || dy1 !== dy2) {
                  turnPenalty = 1; // penaliza giros
              }
          }

          const g = current.g + 1 + turnPenalty;
          const h = heuristic(n, endNode);
          const f = g + h;
          
          const existing = openList.find(o => o.x === n.x && o.y === n.y);
          if (existing) {
              if (g < existing.g) {
                  existing.g = g;
                  existing.f = f;
                  existing.parent = current;
              }
          } else {
              openList.push({ x: n.x, y: n.y, g, h, f, parent: current });
          }
      }
  }
  
  // Fallback si no hay ruta (está encajonado completamente) -> Línea recta
  return [
      { x: startX, y: startY },
      { x: endX, y: endY }
  ];
}

function heuristic(a: any, b: any) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Elimina puntos intermedios en líneas rectas para que el SVG tenga menos nodos
function simplifyPath(path: {x: number, y: number}[]): {x: number, y: number}[] {
  if (path.length <= 2) return path;
  
  const result = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = path[i];
      const next = path[i + 1];
      
      // Si están en la misma línea vertical u horizontal, podemos omitir curr
      const isHorizontal = (prev.y === curr.y && curr.y === next.y);
      const isVertical = (prev.x === curr.x && curr.x === next.x);
      
      if (!isHorizontal && !isVertical) {
          result.push(curr);
      }
  }
  result.push(path[path.length - 1]);
  return result;
}
