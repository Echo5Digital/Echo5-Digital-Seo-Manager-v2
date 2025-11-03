/**
 * Import VIPGTS Ranking Data - ALL WEEKLY CHECKS
 * 
 * This version preserves ALL weekly check dates, not just the latest per month
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Client = require('../models/Client.model');
const Keyword = require('../models/Keyword.model');
const RankHistory = require('../models/RankHistory.model');

const VIPGTS_DOMAIN = 'vipgts.com';

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0].trim());
  const month = parseInt(parts[1].trim());
  const year = parseInt(parts[2].trim());
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  
  return { day, month, year };
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log(`Found ${headers.length - 3} date columns`);
  
  // Extract date columns (skip CLIENT, KEYWORDS, INITIAL RANK)
  const dateColumns = [];
  for (let i = 3; i < headers.length; i++) {
    const header = headers[i];
    if (!header || header === '') continue;
    
    const parsedDate = parseDate(header);
    if (parsedDate) {
      dateColumns.push({
        index: i,
        dateStr: header,
        ...parsedDate
      });
    }
  }
  
  console.log(`Found ${dateColumns.length} valid date columns`);
  
  const keywords = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = line.split(',').map(v => v.trim());
    const keywordName = values[1];
    
    if (!keywordName || keywordName === '') continue;
    
    const rankings = [];
    
    for (const dateCol of dateColumns) {
      const rankValue = values[dateCol.index];
      
      if (!rankValue || rankValue === '' || rankValue === 'NI') {
        rankings.push({
          ...dateCol,
          rank: null,
          notInTop100: true
        });
      } else {
        const rank = parseInt(rankValue);
        if (!isNaN(rank) && rank > 0) {
          rankings.push({
            ...dateCol,
            rank,
            notInTop100: false
          });
        }
      }
    }
    
    keywords.push({
      keyword: keywordName,
      rankings
    });
  }
  
  console.log(`Parsed ${keywords.length} keywords with ranking data`);
  return keywords;
}

async function importAllWeeklyChecks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const client = await Client.findOne({ domain: VIPGTS_DOMAIN });
    if (!client) {
      throw new Error(`Client not found for domain: ${VIPGTS_DOMAIN}`);
    }
    console.log(`Found client: ${client.name} (${client._id})`);
    
    const csvPath = path.join(__dirname, 'vipgts-ranking-data.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const keywordsData = parseCSV(csvContent);
    
    const stats = {
      keywordsProcessed: 0,
      rankHistoryCreated: 0,
      rankHistorySkipped: 0,
      errors: []
    };
    
    for (const keywordData of keywordsData) {
      try {
        console.log(`\nProcessing: ${keywordData.keyword}`);
        
        let keyword = await Keyword.findOne({
          keyword: keywordData.keyword,
          clientId: client._id
        });
        
        if (!keyword) {
          keyword = new Keyword({
            keyword: keywordData.keyword,
            clientId: client._id,
            location: 'United States',
            difficulty: null
          });
          await keyword.save();
          console.log(`  Created keyword (ID: ${keyword._id})`);
        } else {
          console.log(`  Keyword exists (ID: ${keyword._id})`);
        }
        
        console.log(`  Processing ${keywordData.rankings.length} weekly checks`);
        
        // Import ALL rankings (not grouped by month)
        for (const ranking of keywordData.rankings) {
          // Check if this specific date already exists
          const checkedAt = new Date(ranking.year, ranking.month - 1, ranking.day);
          
          const existing = await RankHistory.findOne({
            keyword: keywordData.keyword,
            domain: VIPGTS_DOMAIN,
            checkedAt: {
              $gte: new Date(ranking.year, ranking.month - 1, ranking.day, 0, 0, 0),
              $lt: new Date(ranking.year, ranking.month - 1, ranking.day, 23, 59, 59)
            }
          });
          
          if (existing) {
            stats.rankHistorySkipped++;
            continue;
          }
          
          const rankHistory = new RankHistory({
            domain: VIPGTS_DOMAIN,
            keyword: keywordData.keyword,
            rank: ranking.rank,
            month: ranking.month,
            year: ranking.year,
            checkedAt,
            client: client._id,
            keywordId: keyword._id,
            location: 'United States',
            locationCode: 2840,
            source: 'manual',
            metadata: {
              importDate: new Date(),
              originalDate: ranking.dateStr,
              notInTop100: ranking.notInTop100,
              weeklyImport: true
            }
          });
          
          await rankHistory.save();
          stats.rankHistoryCreated++;
        }
        
        console.log(`  Created ${stats.rankHistoryCreated - (stats.keywordsProcessed * 0)} new weekly records`);
        stats.keywordsProcessed++;
        
      } catch (error) {
        console.error(`Error processing keyword "${keywordData.keyword}":`, error.message);
        stats.errors.push({
          keyword: keywordData.keyword,
          error: error.message
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Keywords processed:     ${stats.keywordsProcessed}`);
    console.log(`Rank history created:   ${stats.rankHistoryCreated}`);
    console.log(`Rank history skipped:   ${stats.rankHistorySkipped} (already exist)`);
    console.log(`Errors:                 ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.keyword}: ${err.error}`);
      });
    }
    
    console.log('\nImport completed successfully!');
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

importAllWeeklyChecks();
