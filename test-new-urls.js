const { generatePdfPageUrl } = require('./lib/cloudinary-pdf.ts');

console.log('Testing new simplified URL generation:');
console.log('');

// Test basic URL generation
const testUrls = [
  generatePdfPageUrl('test-pdf', 1),
  generatePdfPageUrl('test-pdf', 2),
  generatePdfPageUrl('test-pdf', 1, { width: 800 }),
  generatePdfPageUrl('test-pdf', 2, { width: 800, height: 600 })
];

testUrls.forEach((url, index) => {
  console.log(`Test ${index + 1}: ${url}`);
});

console.log('');
console.log('Expected format: f_png,pg_X,q_auto:best[,w_X,h_X],c_fit');
console.log('Should NOT contain: fl_getinfo, a_auto,a_auto, fl_progressive, dpr_auto');
