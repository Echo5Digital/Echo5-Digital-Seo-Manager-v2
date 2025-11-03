require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

/**
 * Import Sheet Data Script
 * 
 * This script imports keyword ranking data from a CSV/JSON file and:
 * 1. Adds keywords to the VIPGTS client if they don't exist
 * 2. Creates rank history records with proper month/year tracking
 * 3. Links everything to the client
 * 
 * SUPPORTED FORMATS:
 * 
 * CSV Format (keywords-data.csv):
 * keyword,rank,month,year,location
 * Executive Transportation New York,8,10,2025,United States
 * NYC Event Transportation,12,10,2025,United States
 * 
 * JSON Format (keywords-data.json):
 * [
 *   {
 *     "keyword": "Executive Transportation New York",
 *     "rank": 8,
 *     "month": 10,
 *     "year": 2025,
 *     "location": "United States"
 *   }
 * ]
 */

async function importKeywordData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));
    const Keyword = require(path.join(__dirname, '../models/Keyword.model'));
    const Client = mongoose.model('Client', new mongoose.Schema({}, {strict: false}));

    // Find VIPGTS client
    const vipClient = await Client.findOne({ website: { $regex: 'vipgts', $options: 'i' } });
    
    if (!vipClient) {
      console.log('❌ VIPGTS client not found');
      process.exit(1);
    }

    console.log('✅ Found VIPGTS client:', vipClient.name);
    console.log(`   Client ID: ${vipClient._id}`);
    console.log(`   Domain: ${vipClient.website}\n`);

    // Check for data file
    const csvPath = path.join(__dirname, 'keywords-data.csv');
    const jsonPath = path.join(__dirname, 'keywords-data.json');
    
    let importData = [];
    let dataSource = null;

    // Try to load JSON first
    if (fs.existsSync(jsonPath)) {
      console.log('📄 Found keywords-data.json');
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      importData = JSON.parse(jsonContent);
      dataSource = 'JSON';
    }
    // Then try CSV
    else if (fs.existsSync(csvPath)) {
      console.log('📄 Found keywords-data.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Parse CSV (skip header)
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx];
        });
        
        // Convert to proper types
        importData.push({
          keyword: row.keyword,
          rank: row.rank ? parseInt(row.rank) : null,
          month: parseInt(row.month),
          year: parseInt(row.year),
          location: row.location || 'United States',
          difficulty: row.difficulty ? parseInt(row.difficulty) : null
        });
      }
      dataSource = 'CSV';
    }
    else {
      console.log('❌ No data file found!');
      console.log('\n📝 Create one of these files in backend/scripts/:');
      console.log('\n1. keywords-data.json:');
      console.log('[');
      console.log('  {');
      console.log('    "keyword": "Executive Transportation New York",');
      console.log('    "rank": 8,');
      console.log('    "month": 10,');
      console.log('    "year": 2025,');
      console.log('    "location": "United States",');
      console.log('    "difficulty": 65');
      console.log('  },');
      console.log('  {');
      console.log('    "keyword": "NYC Event Transportation",');
      console.log('    "rank": 12,');
      console.log('    "month": 10,');
      console.log('    "year": 2025,');
      console.log('    "location": "United States"');
      console.log('  }');
      console.log(']');
      console.log('\n2. keywords-data.csv:');
      console.log('keyword,rank,month,year,location,difficulty');
      console.log('Executive Transportation New York,8,10,2025,United States,65');
      console.log('NYC Event Transportation,12,10,2025,United States,70');
      process.exit(1);
    }

    console.log(`✅ Loaded ${importData.length} records from ${dataSource} file\n`);

    if (importData.length === 0) {
      console.log('⚠️  No data to import');
      process.exit(0);
    }

    // Process each record
    let keywordsAdded = 0;
    let keywordsUpdated = 0;
    let rankHistoryAdded = 0;
    let rankHistorySkipped = 0;
    const errors = [];

    for (const data of importData) {
      try {
        console.log(`\n📝 Processing: "${data.keyword}"`);
        
        // Validate required fields
        if (!data.keyword || !data.month || !data.year) {
          console.log('   ⚠️  Skipped - missing required fields (keyword, month, year)');
          errors.push({ keyword: data.keyword, error: 'Missing required fields' });
          continue;
        }

        // 1. Add/Update keyword in client's keyword list
        let keyword = await Keyword.findOne({
          keyword: data.keyword,
          clientId: vipClient._id
        });

        if (!keyword) {
          // Create new keyword
          keyword = await Keyword.create({
            keyword: data.keyword,
            clientId: vipClient._id,
            searchVolume: 0, // Will be updated when doing analysis
            difficulty: data.difficulty || null,
            location: data.location || 'United States',
            status: 'active'
          });
          console.log(`   ✅ Added keyword to client`);
          keywordsAdded++;
        } else {
          // Update difficulty if provided and different
          if (data.difficulty && keyword.difficulty !== data.difficulty) {
            keyword.difficulty = data.difficulty;
            await keyword.save();
            console.log(`   ✅ Updated keyword difficulty`);
            keywordsUpdated++;
          } else {
            console.log(`   ℹ️  Keyword already exists for client`);
          }
        }

        // 2. Add rank history record
        const existingRank = await RankHistory.findOne({
          domain: vipClient.website,
          keyword: data.keyword,
          month: data.month,
          year: data.year
        });

        if (existingRank) {
          console.log(`   ⚠️  Rank history already exists for ${data.year}-${data.month}`);
          rankHistorySkipped++;
          continue;
        }

        // Calculate location code
        const locationCode = getLocationCode(data.location || 'United States');

        // Create date for the middle of the month
        const checkedDate = new Date(data.year, data.month - 1, 15);

        // Find previous rank for comparison
        let previousRank = null;
        let rankChange = null;
        
        const previousRecord = await RankHistory.findOne({
          domain: vipClient.website,
          keyword: data.keyword,
          $or: [
            { year: data.year, month: { $lt: data.month } },
            { year: { $lt: data.year } }
          ]
        }).sort({ year: -1, month: -1 });

        if (previousRecord && previousRecord.rank) {
          previousRank = previousRecord.rank;
          if (data.rank) {
            rankChange = previousRank - data.rank; // Positive = improved
          }
        }

        // Create rank history record
        const rankRecord = await RankHistory.create({
          domain: vipClient.website,
          keyword: data.keyword,
          rank: data.rank,
          inTop100: data.rank && data.rank <= 100,
          difficulty: data.difficulty || keyword.difficulty || null,
          location: data.location || 'United States',
          locationCode: locationCode,
          month: data.month,
          year: data.year,
          previousRank: previousRank,
          rankChange: rankChange,
          checkedAt: checkedDate,
          source: 'import', // Mark as imported data
          client: vipClient._id,
          keywordId: keyword._id
        });

        console.log(`   ✅ Created rank history: #${data.rank || 'Not ranked'} for ${data.year}-${String(data.month).padStart(2, '0')}`);
        if (rankChange !== null) {
          console.log(`   📊 Change from previous: ${rankChange > 0 ? '+' : ''}${rankChange}`);
        }
        rankHistoryAdded++;

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors.push({ keyword: data.keyword, error: error.message });
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total records processed: ${importData.length}`);
    console.log(`\nKeywords:`);
    console.log(`  ✅ Added: ${keywordsAdded}`);
    console.log(`  🔄 Updated: ${keywordsUpdated}`);
    console.log(`\nRank History:`);
    console.log(`  ✅ Added: ${rankHistoryAdded}`);
    console.log(`  ⚠️  Skipped (duplicates): ${rankHistorySkipped}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors: ${errors.length}`);
      errors.forEach(err => {
        console.log(`   - ${err.keyword}: ${err.error}`);
      });
    }

    // Show final state
    console.log('\n' + '='.repeat(60));
    const totalKeywords = await Keyword.countDocuments({ clientId: vipClient._id });
    const totalRankHistory = await RankHistory.countDocuments({ client: vipClient._id });
    
    console.log(`📈 VIPGTS Client Status:`);
    console.log(`   Total Keywords: ${totalKeywords}`);
    console.log(`   Total Rank History Records: ${totalRankHistory}`);
    
    // Show keywords
    const keywords = await Keyword.find({ clientId: vipClient._id }).select('keyword difficulty');
    console.log(`\n   Keywords list:`);
    keywords.forEach(kw => {
      console.log(`   - ${kw.keyword}${kw.difficulty ? ` (difficulty: ${kw.difficulty})` : ''}`);
    });

    console.log('\n✨ Import completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Helper function to get location code
function getLocationCode(location) {
  if (!location) return 2840;
  
  const locationMap = {
    'canada': 2124,
    'united states': 2840,
    'usa': 2840,
    'us': 2840,
    'france': 2250,
    'germany': 2276,
    'united kingdom': 2826,
    'uk': 2826,
    'spain': 2724,
    'italy': 2380,
    'netherlands': 2528,
    'australia': 2036,
    'india': 2356,
    'singapore': 2702,
    'japan': 2392,
    'china': 2156,
    'dubai': 2784,
    'uae': 2784,
    'united arab emirates': 2784
  };
  
  const normalizedLocation = location.toLowerCase().trim();
  
  for (const [key, code] of Object.entries(locationMap)) {
    if (normalizedLocation.includes(key)) {
      return code;
    }
  }
  
  return 2840; // Default to United States
}

importKeywordData();
