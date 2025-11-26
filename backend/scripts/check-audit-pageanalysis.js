const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Audit = require('../models/Audit.model');
  
  // Get the most recent audit (completed or failed)
  const audit = await Audit.findOne().sort('-createdAt').lean();
  
  if (!audit) {
    console.log('No audits found');
    process.exit(0);
  }
  
  console.log('Latest Audit:');
  console.log('  Status:', audit.status);
  console.log('  Error:', audit.error || 'None');
  console.log('  Created:', audit.createdAt);
  console.log('  Completed:', audit.completedAt || 'N/A');
  console.log('  pageAnalysis count:', audit.results?.pageAnalysis?.length || 0);
  
  if (audit.results?.pageAnalysis?.length > 0) {
    const sample = audit.results.pageAnalysis[0];
    console.log('\nFirst page analysis:');
    console.log('  URL:', sample.url);
    console.log('  Title:', sample.metaData?.title?.text || 'MISSING');
    console.log('  seoAnalysis exists:', !!sample.seoAnalysis);
    console.log('  seoScore:', sample.seoAnalysis?.seoScore ?? 'MISSING');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
