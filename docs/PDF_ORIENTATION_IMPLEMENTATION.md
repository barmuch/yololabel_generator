# PDF Orientation Preservation - Implementation Documentation

## Overview
Implementasi untuk memastikan orientasi PDF P&ID tetap konsisten dari upload hingga tampilan di canvas anotasi.

## Changes Made

### 1. Cloudinary PDF Library Enhancement (`lib/cloudinary-pdf.ts`)

#### Key Improvements:
- **Auto-Orientation**: Ditambahkan parameter `a_auto` untuk preservasi orientasi otomatis
- **Metadata Extraction**: Menggunakan `fl_getinfo` untuk mendapatkan informasi orientasi
- **Enhanced Transformations**: Kombinasi `c_scale` + `a_auto` untuk dimensi original dengan orientasi benar

#### New Transformation Parameters:
```typescript
// Untuk dimensi original dengan orientasi benar
transformations.push('c_scale', 'a_auto');

// Untuk metadata preservation
transformations.push('fl_getinfo');

// Auto-orient untuk semua transformasi
transformations.push('a_auto', 'fl_progressive', 'dpr_auto');
```

### 2. Upload API Enhancement (`app/api/upload-pdf/route.ts`)

#### Enhanced Response Data:
```typescript
{
  success: true,
  publicId: result.public_id,
  secureUrl: result.secure_url,
  pageCount: pdfInfo.pages || 1,
  filename: file.name,
  size: file.size,
  width: pdfInfo.width || 595,
  height: pdfInfo.height || 842,
  format: pdfInfo.format || 'pdf',
  orientation: pdfInfo.orientation || 'portrait', // NEW
  metadata: pdfInfo.image_metadata || {} // NEW
}
```

#### API Call Enhancement:
- Added `image_metadata: true` untuk mendapatkan EXIF data
- Added `colors: true` untuk informasi warna
- Enhanced logging untuk debugging orientasi

### 3. Frontend Processing (`app/labeler/page.tsx`)

#### Smart Canvas Dimension Calculation:
```typescript
// Deteksi orientasi berdasarkan aspect ratio dan metadata
if (result.orientation === 'landscape' || aspectRatio > 1) {
  // Landscape: width dominant
  if (canvasHeight > 1600) {
    canvasHeight = 1600;
    canvasWidth = Math.round(canvasHeight * aspectRatio);
  }
} else {
  // Portrait: height dominant  
  if (canvasHeight > 1600) {
    canvasHeight = 1600;
    canvasWidth = Math.round(canvasHeight * aspectRatio);
  }
}
```

#### Enhanced Logging:
- Log orientasi PDF saat upload
- Log dimensi asli vs canvas
- Log aspect ratio calculations

### 4. Type System Update (`lib/types.ts`)

#### Enhanced ImageItem Type:
```typescript
cloudinary?: {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  originalWidth?: number; // NEW
  originalHeight?: number; // NEW
  orientation?: string; // NEW - portrait, landscape, square
};
```

## How It Works

### 1. Upload Process:
1. PDF di-upload ke Cloudinary dengan metadata extraction
2. API mengembalikan dimensi original + orientasi
3. Frontend menerima data lengkap untuk processing

### 2. URL Generation:
1. Cloudinary URL dibuat dengan parameter `a_auto` untuk orientasi
2. `fl_getinfo` mempertahankan metadata orientasi
3. `c_fit` atau `c_scale` mempertahankan aspect ratio

### 3. Canvas Display:
1. Aspect ratio dihitung dari dimensi original
2. Orientasi dipertimbangkan dalam constraint calculation
3. Canvas dimensions disesuaikan untuk fit optimal

### 4. Rendering:
1. Image dimuat dengan orientasi yang benar dari Cloudinary
2. Canvas Stage menampilkan dengan dimensi yang tepat
3. Annotation coordinates tetap akurat

## Testing

### Manual Test Cases:
1. **Portrait P&ID**: Upload PDF portrait, verify tampil tegak di canvas
2. **Landscape P&ID**: Upload PDF landscape, verify tampil horizontal di canvas  
3. **Mixed Orientation**: Upload PDF dengan halaman mixed orientation
4. **Large Files**: Test dengan P&ID berukuran besar
5. **Multi-page**: Test konsistensi orientasi across multiple pages

### URL Verification:
Check generated URLs contain correct transformations:
- `a_auto` untuk auto-orientation
- `fl_getinfo` untuk metadata
- `c_fit` atau `c_scale` untuk aspect ratio
- `fl_progressive,dpr_auto` untuk quality

## Benefits

✅ **Consistent Orientation**: PDF dan canvas selalu match orientasi  
✅ **Automatic Detection**: Tidak perlu manual rotation  
✅ **Metadata Preservation**: EXIF dan orientation data dipertahankan  
✅ **Quality Maintenance**: High-quality rendering dengan progressive loading  
✅ **Performance Optimized**: Efficient transformations tanpa redundant processing  

## Troubleshooting

### Common Issues:
1. **Wrong Orientation**: Check `a_auto` parameter dalam URL
2. **Blurry Images**: Verify `fl_progressive,dpr_auto` included
3. **Incorrect Dimensions**: Check aspect ratio calculation logic
4. **Missing Metadata**: Ensure `image_metadata: true` dalam API call

### Debug Steps:
1. Check console logs untuk orientasi detection
2. Verify Cloudinary URLs contain correct transformations
3. Test dengan different PDF orientations
4. Monitor network calls untuk transformation parameters
