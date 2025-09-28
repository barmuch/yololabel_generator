// Utility to slice large images into 1280x1280 (or configurable) tiles before upload
// Runs client-side only

export interface TileInfo {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  x: number; // left offset in original image
  y: number; // top offset
  index: number; // sequential tile index
  nameSuffix: string; // e.g., _tile_001
}

export interface TileOptions {
  tileSize?: number; // default 1280
  format?: 'image/png' | 'image/jpeg';
  quality?: number; // for jpeg
  keepSmallerTiles?: boolean; // if false, will pad smaller edge tiles to tileSize (white bg)
}

export async function sliceImageToTiles(file: File, options: TileOptions = {}): Promise<TileInfo[] | null> {
  if (typeof window === 'undefined') return null;
  const { tileSize = 1280, format = 'image/jpeg', quality = 0.92, keepSmallerTiles = true } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const { width, height } = img;
        if (width <= tileSize && height <= tileSize) {
          // No tiling needed
            URL.revokeObjectURL(url);
            resolve(null);
            return;
        }
        const tiles: TileInfo[] = [];
        const cols = Math.ceil(width / tileSize);
        const rows = Math.ceil(height / tileSize);
        let index = 0;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const sx = col * tileSize;
            const sy = row * tileSize;
            const sw = Math.min(tileSize, width - sx);
            const sh = Math.min(tileSize, height - sy);

            const canvas = document.createElement('canvas');
            // If keepSmallerTiles = false, pad to full tile size
            canvas.width = keepSmallerTiles ? sw : tileSize;
            canvas.height = keepSmallerTiles ? sh : tileSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            // Fill white if padding
            if (!keepSmallerTiles && (sw < tileSize || sh < tileSize)) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0,0,canvas.width,canvas.height);
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

            canvas.toBlob((blob) => {
              if (blob) {
                const nameSuffix = `_tile_${String(index + 1).padStart(3,'0')}`;
                tiles.push({
                  blob,
                  width: sw,
                  height: sh,
                  originalWidth: width,
                  originalHeight: height,
                  x: sx,
                  y: sy,
                  index,
                  nameSuffix
                });
              }
              index++;
              if (tiles.length === cols * rows || index === cols * rows) {
                URL.revokeObjectURL(url);
                resolve(tiles);
              }
            }, format, format === 'image/jpeg' ? quality : undefined);
          }
        }
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for tiling'));
    };
    img.src = url;
  });
}
