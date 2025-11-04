/**
 * Normalize title for duplicate detection
 * Removes special characters, extra spaces, and converts to lowercase
 * @param {String} title - The title to normalize
 * @returns {String} Normalized title
 */
const normalizeTitle = (title) => {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '')        // Remove special characters
    .replace(/\s+/g, ' ');          // Normalize spaces again
};

/**
 * Check if two titles are similar (case-insensitive, ignoring special chars)
 * @param {String} title1 
 * @param {String} title2 
 * @returns {Boolean}
 */
const areTitlesSimilar = (title1, title2) => {
  return normalizeTitle(title1) === normalizeTitle(title2);
};

/**
 * Calculate similarity score between two titles using Levenshtein distance
 * @param {String} title1 
 * @param {String} title2 
 * @returns {Number} Similarity percentage (0-100)
 */
const calculateTitleSimilarity = (title1, title2) => {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  
  if (norm1 === norm2) return 100;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  // Simple similarity check - if one contains the other with >70% overlap
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.includes(shorter)) {
    return (shorter.length / longer.length) * 100;
  }
  
  // Word-level comparison
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  
  const avgWords = (words1.length + words2.length) / 2;
  return (commonWords.length / avgWords) * 100;
};

module.exports = {
  normalizeTitle,
  areTitlesSimilar,
  calculateTitleSimilarity
};
