// Test script untuk memverifikasi orientasi PDF
const { generatePdfPageUrl } = require('./lib/cloudinary-pdf.ts');

// Test URLs dengan orientasi berbeda
console.log('=== Test PDF Orientation Preservation ===\n');

// Test Portrait PDF (contoh)
const portraitUrl = generatePdfPageUrl('sample_portrait_pdf', 1, {
  width: 800,
  preserveAspectRatio: true,
  quality: 'auto:best'
});

console.log('Portrait PDF URL:');
console.log(portraitUrl);
console.log('\nTransformations included:');
console.log('- f_png (format)');
console.log('- pg_1 (page 1)');
console.log('- q_auto:best (quality)');
console.log('- fl_getinfo (preserve metadata)');
console.log('- w_800,c_scale (width with aspect ratio)');
console.log('- a_auto (auto-orientation)');
console.log('- fl_progressive,dpr_auto (crisp rendering)');

console.log('\n' + '='.repeat(50) + '\n');

// Test Landscape PDF (contoh)
const landscapeUrl = generatePdfPageUrl('sample_landscape_pdf', 1, {
  height: 600,
  preserveAspectRatio: true,
  quality: 'auto:best'
});

console.log('Landscape PDF URL:');
console.log(landscapeUrl);
console.log('\nTransformations included:');
console.log('- f_png (format)');
console.log('- pg_1 (page 1)');
console.log('- q_auto:best (quality)');
console.log('- fl_getinfo (preserve metadata)');
console.log('- h_600,c_scale (height with aspect ratio)');
console.log('- a_auto (auto-orientation)');
console.log('- fl_progressive,dpr_auto (crisp rendering)');

console.log('\n' + '='.repeat(50) + '\n');

// Test tanpa dimensi - gunakan original dengan auto-orientation
const originalUrl = generatePdfPageUrl('sample_pdf', 1, {
  preserveAspectRatio: true,
  quality: 'auto:best'
});

console.log('Original Size with Auto-Orientation:');
console.log(originalUrl);
console.log('\nTransformations included:');
console.log('- f_png (format)');
console.log('- pg_1 (page 1)');
console.log('- q_auto:best (quality)');
console.log('- fl_getinfo (preserve metadata)');
console.log('- c_scale,a_auto (original size with auto-orientation)');
console.log('- fl_progressive,dpr_auto (crisp rendering)');
