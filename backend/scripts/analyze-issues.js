const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const Audit = require('../models/Audit.model');
    const Client = require('../models/Client.model');
    
    // Find client by domain
    const client = await Client.findOne({ domain: /openarmsinitiative\.com/ });
    const audit = await Audit.findOne({ clientId: client._id }).sort('-createdAt');
    
    console.log('\n🔍 Analyzing Results Structure:\n');
    
    const results = audit.results;
    
    // Check top-level issue arrays
    const topLevelArrays = ['robotsIssues', 'sslIssues', 'sitemapIssues', 'schemaIssues', 'performanceIssues'];
    topLevelArrays.forEach(key => {
      if (results[key]) {
        console.log(`${key}:`, results[key].length, 'issues');
        results[key].forEach((issue, i) => {
          console.log(`  ${i + 1}. [${issue.severity}] ${issue.issue || issue.type}`);
        });
      }
    });
    
    // Check metaAnalysis
    if (results.metaAnalysis) {
      let totalMetaIssues = 0;
      let criticalMeta = 0, highMeta = 0, mediumMeta = 0, lowMeta = 0;
      
      results.metaAnalysis.forEach(page => {
        if (page.issues) {
          totalMetaIssues += page.issues.length;
          page.issues.forEach(issue => {
            if (issue.severity === 'Critical') criticalMeta++;
            if (issue.severity === 'High') highMeta++;
            if (issue.severity === 'Medium') mediumMeta++;
            if (issue.severity === 'Low') lowMeta++;
          });
        }
      });
      console.log(`\nmetaAnalysis: ${totalMetaIssues} issues across ${results.metaAnalysis.length} pages`);
      console.log(`  Critical: ${criticalMeta}, High: ${highMeta}, Medium: ${mediumMeta}, Low: ${lowMeta}`);
    }
    
    // Check headingStructure
    if (results.headingStructure) {
      let totalHeadingIssues = 0;
      let criticalH = 0, highH = 0, mediumH = 0, lowH = 0;
      
      results.headingStructure.forEach(page => {
        if (page.issues) {
          totalHeadingIssues += page.issues.length;
          page.issues.forEach(issue => {
            if (issue.severity === 'Critical') criticalH++;
            if (issue.severity === 'High') highH++;
            if (issue.severity === 'Medium') mediumH++;
            if (issue.severity === 'Low') lowH++;
          });
        }
      });
      console.log(`\nheadingStructure: ${totalHeadingIssues} issues across ${results.headingStructure.length} pages`);
      console.log(`  Critical: ${criticalH}, High: ${highH}, Medium: ${mediumH}, Low: ${lowH}`);
    }
    
    // Check imageAnalysis
    if (results.imageAnalysis) {
      let totalImageIssues = 0;
      let criticalI = 0, highI = 0, mediumI = 0, lowI = 0;
      
      results.imageAnalysis.forEach(page => {
        if (page.issues) {
          totalImageIssues += page.issues.length;
          page.issues.forEach(issue => {
            if (issue.severity === 'Critical') criticalI++;
            if (issue.severity === 'High') highI++;
            if (issue.severity === 'Medium') mediumI++;
            if (issue.severity === 'Low') lowI++;
          });
        }
      });
      console.log(`\nimageAnalysis: ${totalImageIssues} issues across ${results.imageAnalysis.length} pages`);
      console.log(`  Critical: ${criticalI}, High: ${highI}, Medium: ${mediumI}, Low: ${lowI}`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
