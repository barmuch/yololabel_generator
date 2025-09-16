# Cara Mengatasi Masalah URL Error

## Masalah
Aplikasi menggunakan URL lama yang ter-cache dengan parameter error:
- `fl_getinfo,c_scale,a_auto,a_auto,fl_progressive,dpr_auto`
- Menyebabkan error "The requested resource isn't a valid image"

## Solusi yang Sudah Diterapkan
✅ File `lib/cloudinary-pdf.ts` sudah diperbaiki dengan parameter sederhana:
- Format baru: `f_png,pg_X,q_auto:best,w_800,c_fit`
- Menghilangkan parameter error: `fl_getinfo`, `a_auto,a_auto`, `fl_progressive`, `dpr_auto`

## Cara Menggunakan Kode Baru

### Opsi 1: Upload PDF Baru
Upload PDF baru ke aplikasi. PDF baru akan menggunakan fungsi URL generation yang sudah diperbaiki.

### Opsi 2: Clear Cache Browser
1. Buka Developer Tools (F12)
2. Pilih tab "Application" atau "Storage"
3. Expand "Local Storage"
4. Pilih domain aplikasi (localhost:3000)
5. Hapus semua data atau cari key yang mengandung "pdf"
6. Refresh halaman

### Opsi 3: Clear Cache Programmatically
Tambahkan kode ini di console browser:
```javascript
// Clear all localStorage
localStorage.clear();

// Atau hapus specific key jika tahu nama key-nya
localStorage.removeItem('pdf-store');

// Refresh halaman
window.location.reload();
```

## Test URLs
URL baru yang benar:
```
https://res.cloudinary.com/dhgbfzu3c/image/upload/f_png,pg_1,q_auto:best,w_800,c_fit/yolo-pdfs/pdf_1757505987245
```

URL lama yang error:
```
https://res.cloudinary.com/dhgbfzu3c/image/upload/f_png,pg_1,q_auto:best,fl_getinfo,c_scale,a_auto,a_auto,fl_progressive,dpr_auto/yolo-pdfs/pdf_1757505987245
```

## Status
- ✅ Kode sudah diperbaiki
- ✅ URL baru sudah berhasil di-test (HTTP 200)
- ⏳ Perlu clear cache untuk menggunakan kode baru
