/**
 * Import VIPGTS Ranking Data from CSV
 * 
 * This script imports keyword ranking data from a CSV file with date-based columns.
 * Format: CLIENT,KEYWORDS,INITIAL RANK,01-03-2025,10-03-2025,...
 * 
 * Features:
 * - Parses date columns (DD-MM-YYYY format)
 * - Handles "NI" (Not In top 100) values
 * - Creates keywords in VIPGTS client
 * - Creates rank history for each date with ranking data
 * - Calculates rank changes from previous dates
 * - Uses the most recent rank in each month
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import models
const Client = require('../models/Client.model');
const Keyword = require('../models/Keyword.model');
const RankHistory = require('../models/RankHistory.model');

// VIPGTS domain
const VIPGTS_DOMAIN = 'vipgts.com';

/**
 * Parse date from DD-MM-YYYY format
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Handle formats like "01-03-2025", "1-04-2025", "3-11-2025"
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0].trim());
  const month = parseInt(parts[1].trim());
  const year = parseInt(parts[2].trim());
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  
  return { day, month, year };
}

/**
 * Parse CSV content
 */
function parseCSV(content) {
  const lines = content.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  // Parse header to get date columns
  const headerRow = lines[0].split(',');
  const dateColumns = [];
  
  // Find all date columns (skip CLIENT, KEYWORDS, INITIAL RANK)
  for (let i = 3; i < headerRow.length; i++) {
    const dateStr = headerRow[i];
    const parsed = parseDate(dateStr);
    if (parsed) {
      dateColumns.push({
        index: i,
        dateStr: dateStr.trim(),
        ...parsed
      });
    }
  }
  
  console.log(`Found ${dateColumns.length} date columns`);
  
  // Parse data rows
  const keywords = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    const keywordName = columns[1] ? columns[1].trim() : '';
    
    if (!keywordName || keywordName === '') continue;
    
    // Get initial rank (optional)
    const initialRank = columns[2] && columns[2].trim() !== '' && columns[2].trim().toUpperCase() !== 'NI' 
      ? parseInt(columns[2].trim()) 
      : null;
    
    // Get all rankings for this keyword
    const rankings = [];
    for (const dateCol of dateColumns) {
      const rankValue = columns[dateCol.index] ? columns[dateCol.index].trim() : '';
      
      // Skip empty values
      if (rankValue === '') continue;
      
      // Handle "NI" (Not In top 100)
      if (rankValue.toUpperCase() === 'NI') {
        rankings.push({
          ...dateCol,
          rank: null, // No rank means not in top 100
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
    
    if (rankings.length > 0) {
      keywords.push({
        keyword: keywordName,
        initialRank,
        rankings
      });
    }
  }
  
  console.log(`Parsed ${keywords.length} keywords with ranking data`);
  return keywords;
}

/**
 * Group rankings by month and keep only the most recent rank per month
 */
function groupByMonth(rankings) {
  const monthGroups = {};
  
  for (const ranking of rankings) {
    const monthKey = `${ranking.year}-${String(ranking.month).padStart(2, '0')}`;
    
    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = [];
    }
    
    monthGroups[monthKey].push(ranking);
  }
  
  // For each month, keep only the most recent date
  const monthlyRankings = [];
  for (const [monthKey, rankings] of Object.entries(monthGroups)) {
    // Sort by day descending to get the most recent
    rankings.sort((a, b) => b.day - a.day);
    const mostRecent = rankings[0];
    
    monthlyRankings.push({
      month: mostRecent.month,
      year: mostRecent.year,
      day: mostRecent.day,
      dateStr: mostRecent.dateStr,
      rank: mostRecent.rank,
      notInTop100: mostRecent.notInTop100
    });
  }
  
  // Sort chronologically
  monthlyRankings.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });
  
  return monthlyRankings;
}

/**
 * Main import function
 */
async function importRankingData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find VIPGTS client
    const client = await Client.findOne({ domain: VIPGTS_DOMAIN });
    if (!client) {
      throw new Error(`Client not found for domain: ${VIPGTS_DOMAIN}`);
    }
    console.log(`Found client: ${client.name} (${client._id})`);
    
    // Read CSV file
    const csvPath = path.join(__dirname, 'vipgts-ranking-data.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}\nPlease save your CSV file as 'vipgts-ranking-data.csv' in the backend/scripts/ folder`);
    }
    
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const keywordsData = parseCSV(csvContent);
    
    // Track statistics
    const stats = {
      keywordsAdded: 0,
      keywordsUpdated: 0,
      rankHistoryCreated: 0,
      rankHistorySkipped: 0,
      errors: []
    };
    
    // Process each keyword
    for (const keywordData of keywordsData) {
      try {
        console.log(`\nProcessing: ${keywordData.keyword}`);
        
        // Find or create keyword
        let keyword = await Keyword.findOne({
          keyword: keywordData.keyword,
          clientId: client._id
        });
        
        if (keyword) {
          console.log(`  Keyword exists (ID: ${keyword._id})`);
          stats.keywordsUpdated++;
        } else {
          // Create new keyword
          keyword = new Keyword({
            keyword: keywordData.keyword,
            clientId: client._id,
            location: 'United States', // Default location
            difficulty: null // No difficulty data in CSV
          });
          await keyword.save();
          console.log(`  Created keyword (ID: ${keyword._id})`);
          stats.keywordsAdded++;
        }
        
        // Group rankings by month (keep most recent per month)
        const monthlyRankings = groupByMonth(keywordData.rankings);
        console.log(`  Processing ${monthlyRankings.length} monthly rankings`);
        
        // Process each monthly ranking
        for (let i = 0; i < monthlyRankings.length; i++) {
          const ranking = monthlyRankings[i];
          
          // Check if rank history already exists for this month
          const existing = await RankHistory.findOne({
            keyword: keywordData.keyword,
            domain: VIPGTS_DOMAIN,
            month: ranking.month,
            year: ranking.year
          });
          
          if (existing) {
            console.log(`  Skipped ${ranking.month}/${ranking.year} - already exists`);
            stats.rankHistorySkipped++;
            continue;
          }
          
          // Calculate previous rank and rank change
          let previousRank = null;
          let rankChange = 0;
          
          if (i > 0) {
            // Use previous month's rank
            const prevRanking = monthlyRankings[i - 1];
            previousRank = prevRanking.rank;
            
            // Calculate change (positive = improved, negative = declined)
            if (ranking.rank !== null && previousRank !== null) {
              rankChange = previousRank - ranking.rank;
            } else if (ranking.rank !== null && previousRank === null) {
              // Entered top 100
              rankChange = 0; // Neutral, newly ranked
            } else if (ranking.rank === null && previousRank !== null) {
              // Dropped out of top 100
              rankChange = -previousRank; // Negative change
            }
          }
          
          // Create rank history
          const rankHistory = new RankHistory({
            domain: VIPGTS_DOMAIN,
            keyword: keywordData.keyword,
            rank: ranking.rank,
            month: ranking.month,
            year: ranking.year,
            previousRank,
            rankChange,
            client: client._id,
            keywordId: keyword._id,
            location: 'United States',
            locationCode: 2840, // United States location code
            source: 'manual', // CSV import counts as manual entry
            metadata: {
              importDate: new Date(),
              originalDate: ranking.dateStr,
              notInTop100: ranking.notInTop100
            }
          });
          
          await rankHistory.save();
          
          const rankDisplay = ranking.rank || 'Not in top 100';
          const changeDisplay = rankChange > 0 ? `+${rankChange}` : rankChange;
          console.log(`  Created ${ranking.month}/${ranking.year}: Rank ${rankDisplay} (${changeDisplay})`);
          stats.rankHistoryCreated++;
        }
        
      } catch (error) {
        console.error(`Error processing keyword "${keywordData.keyword}":`, error.message);
        stats.errors.push({
          keyword: keywordData.keyword,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Keywords added:         ${stats.keywordsAdded}`);
    console.log(`Keywords updated:       ${stats.keywordsUpdated}`);
    console.log(`Rank history created:   ${stats.rankHistoryCreated}`);
    console.log(`Rank history skipped:   ${stats.rankHistorySkipped} (already exist)`);
    console.log(`Errors:                 ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.keyword}: ${err.error}`);
      });
    }
    
    console.log('\nImport completed successfully!');
    
  } catch (error) {
    console.error('Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run import
importRankingData();
