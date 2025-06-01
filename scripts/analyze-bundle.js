#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Simple Bundle Analysis Script
 * Analyzes the built chunks and provides insights
 */

class BundleAnalyzer {
  constructor() {
    this.buildDir = path.join(process.cwd(), '.next');
    this.chunksDir = path.join(this.buildDir, 'static', 'chunks');
  }

  /**
   * Analyze bundle sizes and structure
   */
  analyze() {
    console.log('🔍 Analyzing Bundle Structure...\n');

    if (!fs.existsSync(this.chunksDir)) {
      console.error('❌ Build directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    const files = fs.readdirSync(this.chunksDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));

    console.log(`📊 Found ${jsFiles.length} JavaScript chunks\n`);

    // Analyze chunks
    const chunks = this.analyzeChunks(jsFiles);
    
    // Display results
    this.displayResults(chunks);
    
    // Check optimizations
    this.checkOptimizations(chunks);
  }

  /**
   * Analyze individual chunks
   */
  analyzeChunks(files) {
    const chunks = [];
    let totalSize = 0;

    files.forEach(file => {
      const filePath = path.join(this.chunksDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = stats.size / 1024;
      
      totalSize += stats.size;

      chunks.push({
        name: file,
        size: stats.size,
        sizeKB: sizeKB,
        type: this.categorizeChunk(file)
      });
    });

    // Sort by size (largest first)
    chunks.sort((a, b) => b.size - a.size);

    return {
      chunks,
      totalSize,
      totalSizeKB: totalSize / 1024,
      totalSizeMB: totalSize / (1024 * 1024)
    };
  }

  /**
   * Categorize chunks by type
   */
  categorizeChunk(filename) {
    if (filename.includes('main-')) return 'main';
    if (filename.includes('framework-')) return 'framework';
    if (filename.includes('vendor')) return 'vendor';
    if (filename.includes('app/')) return 'page';
    if (filename.match(/^\d+-/)) return 'dynamic';
    return 'other';
  }

  /**
   * Display analysis results
   */
  displayResults(analysis) {
    console.log('📈 Bundle Size Analysis:');
    console.log('========================');
    console.log(`Total Bundle Size: ${analysis.totalSizeMB.toFixed(2)} MB`);
    console.log(`Total Chunks: ${analysis.chunks.length}`);
    console.log('');

    // Group by type
    const byType = {};
    analysis.chunks.forEach(chunk => {
      if (!byType[chunk.type]) {
        byType[chunk.type] = { count: 0, totalSize: 0, chunks: [] };
      }
      byType[chunk.type].count++;
      byType[chunk.type].totalSize += chunk.size;
      byType[chunk.type].chunks.push(chunk);
    });

    console.log('📋 Chunks by Type:');
    console.log('==================');
    Object.entries(byType).forEach(([type, data]) => {
      const avgSize = (data.totalSize / data.count / 1024).toFixed(1);
      const totalSizeMB = (data.totalSize / 1024 / 1024).toFixed(2);
      console.log(`${type.toUpperCase()}: ${data.count} chunks, ${totalSizeMB} MB total, ${avgSize} KB avg`);
    });
    console.log('');

    // Show largest chunks
    console.log('🔝 Largest Chunks:');
    console.log('==================');
    analysis.chunks.slice(0, 10).forEach((chunk, index) => {
      const sizeDisplay = chunk.sizeKB > 1024 
        ? `${(chunk.sizeKB / 1024).toFixed(2)} MB`
        : `${chunk.sizeKB.toFixed(1)} KB`;
      console.log(`${index + 1}. ${chunk.name} - ${sizeDisplay} (${chunk.type})`);
    });
    console.log('');
  }

  /**
   * Check if our optimizations are working
   */
  checkOptimizations(analysis) {
    console.log('✅ Optimization Check:');
    console.log('======================');

    const vendorChunks = analysis.chunks.filter(chunk => chunk.type === 'vendor');
    const expectedVendors = ['charts-vendor', 'date-vendor', 'dnd-vendor', 'editor-vendor'];
    
    console.log(`Found ${vendorChunks.length} vendor chunks:`);
    
    const foundVendors = [];
    vendorChunks.forEach(chunk => {
      const sizeDisplay = chunk.sizeKB > 1024 
        ? `${(chunk.sizeKB / 1024).toFixed(2)} MB`
        : `${chunk.sizeKB.toFixed(1)} KB`;
      console.log(`  ✓ ${chunk.name} - ${sizeDisplay}`);
      
      // Check if it's one of our expected vendors
      expectedVendors.forEach(expected => {
        if (chunk.name.includes(expected)) {
          foundVendors.push(expected);
        }
      });
    });

    console.log('');
    console.log('🎯 Custom Vendor Chunks:');
    expectedVendors.forEach(vendor => {
      const found = foundVendors.includes(vendor);
      console.log(`  ${found ? '✅' : '❌'} ${vendor}: ${found ? 'Found' : 'Not found'}`);
    });

    console.log('');
    console.log('📏 Size Thresholds:');
    const mainChunk = analysis.chunks.find(chunk => chunk.type === 'main');
    if (mainChunk) {
      const mainSizeKB = mainChunk.sizeKB;
      console.log(`  Main chunk: ${mainSizeKB.toFixed(1)} KB ${mainSizeKB < 500 ? '✅' : '⚠️'} (target: <500 KB)`);
    }

    const totalSizeMB = analysis.totalSizeMB;
    console.log(`  Total bundle: ${totalSizeMB.toFixed(2)} MB ${totalSizeMB < 10 ? '✅' : '⚠️'} (target: <10 MB)`);

    // Check for code splitting
    const dynamicChunks = analysis.chunks.filter(chunk => chunk.type === 'dynamic');
    console.log(`  Dynamic chunks: ${dynamicChunks.length} ${dynamicChunks.length > 5 ? '✅' : '⚠️'} (target: >5 for good splitting)`);

    console.log('');
    console.log('🚀 Performance Recommendations:');
    
    if (totalSizeMB > 5) {
      console.log('  ⚠️ Consider further code splitting for large routes');
    }
    
    if (mainChunk && mainChunk.sizeKB > 300) {
      console.log('  ⚠️ Main chunk is large, consider moving more code to dynamic imports');
    }
    
    if (vendorChunks.length < 3) {
      console.log('  ⚠️ Few vendor chunks found, consider more granular vendor splitting');
    }
    
    if (foundVendors.length === expectedVendors.length) {
      console.log('  ✅ All custom vendor chunks are working correctly!');
    }
    
    if (dynamicChunks.length > 10) {
      console.log('  ✅ Good code splitting detected!');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze();
}

module.exports = BundleAnalyzer;
