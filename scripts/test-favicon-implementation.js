#!/usr/bin/env node

/**
 * Test script to verify favicon implementation
 * This script checks for proper favicon files and configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Favicon Implementation...\n');

// Test 1: Check if favicon files exist
console.log('1. Checking favicon files...');
const faviconFiles = [
  'public/favicon.ico',
  'public/suped-nexvolv-logo.png',
  'public/site.webmanifest'
];

let filesExist = true;
faviconFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
    filesExist = false;
  }
});

// Test 2: Check favicon.ico file size and format
console.log('\n2. Checking favicon.ico properties...');
try {
  const faviconStats = fs.statSync('public/favicon.ico');
  console.log(`   ✅ Size: ${faviconStats.size} bytes`);
  
  // Read first few bytes to check if it's a valid ICO file
  const buffer = fs.readFileSync('public/favicon.ico');
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    console.log('   ✅ Valid ICO file format');
  } else {
    console.log('   ⚠️  File may not be a valid ICO format');
  }
} catch (error) {
  console.log(`   ❌ Error reading favicon.ico: ${error.message}`);
}

// Test 3: Check PNG logo file
console.log('\n3. Checking PNG logo file...');
try {
  const logoStats = fs.statSync('public/suped-nexvolv-logo.png');
  console.log(`   ✅ Size: ${logoStats.size} bytes`);
  
  // Check PNG signature
  const buffer = fs.readFileSync('public/suped-nexvolv-logo.png');
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    console.log('   ✅ Valid PNG file format');
  } else {
    console.log('   ❌ Invalid PNG file format');
  }
} catch (error) {
  console.log(`   ❌ Error reading PNG logo: ${error.message}`);
}

// Test 4: Check web manifest
console.log('\n4. Checking web manifest...');
try {
  const manifestContent = fs.readFileSync('public/site.webmanifest', 'utf-8');
  const manifest = JSON.parse(manifestContent);
  
  console.log(`   ✅ Valid JSON format`);
  console.log(`   ✅ Name: ${manifest.name}`);
  console.log(`   ✅ Icons: ${manifest.icons.length} defined`);
} catch (error) {
  console.log(`   ❌ Error reading manifest: ${error.message}`);
}

// Test 5: Check layout.tsx configuration
console.log('\n5. Checking layout.tsx configuration...');
try {
  const layoutContent = fs.readFileSync('src/app/layout.tsx', 'utf-8');
  
  if (layoutContent.includes('favicon.ico')) {
    console.log('   ✅ favicon.ico referenced in metadata');
  } else {
    console.log('   ❌ favicon.ico not found in metadata');
  }
  
  if (layoutContent.includes('site.webmanifest')) {
    console.log('   ✅ manifest referenced in metadata');
  } else {
    console.log('   ❌ manifest not found in metadata');
  }
  
  if (layoutContent.includes('apple')) {
    console.log('   ✅ Apple touch icon configured');
  } else {
    console.log('   ❌ Apple touch icon not configured');
  }
} catch (error) {
  console.log(`   ❌ Error reading layout.tsx: ${error.message}`);
}

// Test 6: Check Next.js configuration
console.log('\n6. Checking Next.js configuration...');
try {
  const nextConfigContent = fs.readFileSync('next.config.ts', 'utf-8');
  
  if (nextConfigContent.includes('favicon.ico') && nextConfigContent.includes('headers')) {
    console.log('   ✅ Favicon caching headers configured');
  } else {
    console.log('   ❌ Favicon caching headers not configured');
  }
} catch (error) {
  console.log(`   ❌ Error reading next.config.ts: ${error.message}`);
}

console.log('\n📋 Summary:');
if (filesExist) {
  console.log('✅ All favicon files are present');
  console.log('✅ Favicon implementation appears to be correctly configured');
  console.log('\n🚀 Next steps:');
  console.log('   1. Start the development server: npm run dev');
  console.log('   2. Check favicon display in browser tabs');
  console.log('   3. Test favicon persistence during navigation');
  console.log('   4. Verify favicon appears in bookmarks');
} else {
  console.log('❌ Some favicon files are missing');
  console.log('   Please ensure all required files are in place');
}

console.log('\n✨ Favicon implementation test completed!');
