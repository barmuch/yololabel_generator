// Simple test of generatePdfPageUrl function

function generatePdfPageUrl(publicId, pageNumber, options = {}) {
  const {
    width,
    height,
    quality = 'auto:best',
    format = 'png',
    preserveAspectRatio = true
  } = options;

  const cloudName = 'dhgbfzu3c'; // Using known cloud name
  
  // Build basic transformations - keep it simple
  const transformations = [
    `f_${format}`,
    `pg_${pageNumber}`, // Cloudinary uses 1-based page indexing for PDFs
    `q_${quality}`
  ];

  // Add dimensions if specified
  if (width) {
    transformations.push(`w_${width}`);
  }
  if (height) {
    transformations.push(`h_${height}`);
  }

  // Add crop mode
  if (preserveAspectRatio) {
    transformations.push('c_fit');
  } else {
    transformations.push('c_fill');
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${publicId}`;
}

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
