const americanOnly = require('./american-only.js');
const americanToBritishSpelling = require('./american-to-british-spelling.js');
const americanToBritishTitles = require("./american-to-british-titles.js");
const britishOnly = require('./british-only.js');

class Translator {
  constructor() {
    // Create reverse mappings for British to American
    this.britishToAmericanSpelling = this.reverseMapping(americanToBritishSpelling);
    this.britishToAmericanTitles = this.reverseMapping(americanToBritishTitles);
  }

  reverseMapping(obj) {
    const reversed = {};
    for (let key in obj) {
      reversed[obj[key]] = key;
    }
    return reversed;
  }

  translate(text, locale) {
    if (text === undefined || locale === undefined) {
      return { error: 'Required field(s) missing' };
    }

    if (text === '') {
      return { error: 'No text to translate' };
    }

    if (locale !== 'american-to-british' && locale !== 'british-to-american') {
      return { error: 'Invalid value for locale field' };
    }

    let translated = text;
    let hasTranslation = false;

    if (locale === 'american-to-british') {
      // Translate titles
      translated = this.translateTitles(translated, americanToBritishTitles, true);
      if (translated !== text) hasTranslation = true;

      // Translate time format (10:30 -> 10.30)
      const timeTranslated = this.translateTime(translated, 'american-to-british');
      if (timeTranslated !== translated) hasTranslation = true;
      translated = timeTranslated;

      // Translate American-only terms
      const termsTranslated = this.translateTerms(translated, americanOnly);
      if (termsTranslated !== translated) hasTranslation = true;
      translated = termsTranslated;

      // Translate spelling differences
      const spellingTranslated = this.translateTerms(translated, americanToBritishSpelling);
      if (spellingTranslated !== translated) hasTranslation = true;
      translated = spellingTranslated;

    } else if (locale === 'british-to-american') {
      // Translate titles
      translated = this.translateTitles(translated, this.britishToAmericanTitles, false);
      if (translated !== text) hasTranslation = true;

      // Translate time format (10.30 -> 10:30)
      const timeTranslated = this.translateTime(translated, 'british-to-american');
      if (timeTranslated !== translated) hasTranslation = true;
      translated = timeTranslated;

      // Translate British-only terms
      const termsTranslated = this.translateTerms(translated, britishOnly);
      if (termsTranslated !== translated) hasTranslation = true;
      translated = termsTranslated;

      // Translate spelling differences
      const spellingTranslated = this.translateTerms(translated, this.britishToAmericanSpelling);
      if (spellingTranslated !== translated) hasTranslation = true;
      translated = spellingTranslated;
    }

    if (!hasTranslation) {
      return { 
        text: text, 
        translation: "Everything looks good to me!" 
      };
    }

    return {
      text: text,
      translation: translated
    };
  }

  translateTitles(text, titleMap, isAmericanToBritish) {
    let result = text;
    
    // Sort by length (longest first) to handle overlapping matches
    const titles = Object.keys(titleMap).sort((a, b) => b.length - a.length);
    
    for (let title of titles) {
      const target = titleMap[title];
      
      // Create regex that matches the title at word boundaries
      // Case insensitive matching
      const regex = new RegExp(`\\b${this.escapeRegex(title)}(?=\\s)`, 'gi');
      
      result = result.replace(regex, (match) => {
        // Preserve the case of the first letter
        const isCapitalized = match[0] === match[0].toUpperCase();
        let replacement = target;
        
        if (isCapitalized) {
          replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        
        return `<span class="highlight">${replacement}</span>`;
      });
    }
    
    return result;
  }

  translateTime(text, direction) {
    if (direction === 'american-to-british') {
      // Convert 10:30 to 10.30
      return text.replace(/(\d{1,2}):(\d{2})/g, '<span class="highlight">$1.$2</span>');
    } else {
      // Convert 10.30 to 10:30
      return text.replace(/(\d{1,2})\.(\d{2})/g, '<span class="highlight">$1:$2</span>');
    }
  }

  translateTerms(text, dictionary) {
    let result = text;
    
    // Sort by length (longest first) to handle multi-word phrases
    const terms = Object.keys(dictionary).sort((a, b) => b.length - a.length);
    
    for (let term of terms) {
      const translation = dictionary[term];
      
      // Create regex for case-insensitive word boundary matching
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      
      result = result.replace(regex, (match) => {
        // Preserve capitalization
        const replacement = this.preserveCase(match, translation);
        return `<span class="highlight">${replacement}</span>`;
      });
    }
    
    return result;
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  preserveCase(original, replacement) {
    // If original is all uppercase
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    // If original starts with uppercase
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    // Otherwise return lowercase
    return replacement.toLowerCase();
  }
}

module.exports = Translator;