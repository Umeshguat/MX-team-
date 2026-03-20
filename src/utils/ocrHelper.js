import * as FileSystem from 'expo-file-system';
import { OCR_API_KEY } from '../config';

/**
 * Extract KM reading from an odometer image using OCR.space API
 * @param {string} imageUri - local file URI of the image
 * @returns {Promise<string|null>} - extracted KM number or null
 */
export async function extractKmFromImage(imageUri) {
  try {
    // Read image as base64
    var base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    var base64Data = 'data:image/jpg;base64,' + base64Image;

    // Try OCR Engine 2 first (better for photos), fallback to Engine 1
    var result = await callOcrApi(base64Data, '2');
    var km = parseOcrResult(result);

    if (!km) {
      console.log('Engine 2 failed, trying Engine 1...');
      var result2 = await callOcrApi(base64Data, '1');
      km = parseOcrResult(result2);
    }

    console.log('Final extracted KM:', km);
    return km;
  } catch (err) {
    console.log('OCR error:', err);
    return null;
  }
}

/**
 * Call OCR.space API with given engine
 */
async function callOcrApi(base64Data, engine) {
  var formData = new FormData();
  formData.append('base64Image', base64Data);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', engine);
  formData.append('scale', 'true');
  formData.append('detectOrientation', 'true');
  formData.append('isTable', 'true');

  var response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': OCR_API_KEY,
    },
    body: formData,
  });

  var result = await response.json();
  console.log('OCR Engine ' + engine + ' response:', JSON.stringify(result));
  return result;
}

/**
 * Parse OCR API result and extract KM
 */
function parseOcrResult(result) {
  if (result.ParsedResults && result.ParsedResults.length > 0) {
    var parsed = result.ParsedResults[0];
    if (parsed.ErrorMessage) {
      console.log('OCR error:', parsed.ErrorMessage);
      return null;
    }
    var fullText = parsed.ParsedText || '';
    console.log('OCR full text:', fullText);
    return extractBestKmReading(fullText);
  }
  if (result.ErrorMessage) {
    console.log('OCR API error:', result.ErrorMessage);
  }
  return null;
}

/**
 * Speedometer dial numbers to filter out
 */
var SPEED_NUMBERS = {
  '0': true, '10': true, '20': true, '30': true, '40': true,
  '50': true, '60': true, '70': true, '80': true, '90': true,
  '100': true, '110': true, '120': true, '130': true, '140': true,
  '150': true, '160': true, '180': true, '200': true, '220': true, '240': true,
};

/**
 * Extract the best KM reading from OCR text
 */
function extractBestKmReading(text) {
  if (!text) return null;

  // Clean text
  var cleanText = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('Clean OCR text:', cleanText);

  // Remove speed references like "120 km/h", "km/h"
  var filtered = cleanText.replace(/\d+\s*km\s*\/\s*h/gi, '');

  // Remove common watermark patterns (dates, times, phone brands)
  filtered = filtered.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\s*,?\s*\d{4}/gi, '');
  filtered = filtered.replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, '');
  filtered = filtered.replace(/\b(vivo|samsung|oppo|realme|xiaomi|redmi|poco|oneplus|iphone|motorola)\b/gi, '');

  console.log('Filtered text:', filtered);

  var numbers = [];
  var match;

  // === PRIORITY 1: Number directly before "km" (not "km/h") ===
  // Handles: "41895.4 km", "418954km", "41895 4 km", "41 895.4 km"
  var kmRegex = /([\d][\d\s.,]*[\d])\s*km(?!\s*\/\s*h)\b/gi;
  while ((match = kmRegex.exec(cleanText)) !== null) {
    var cleaned = cleanNumber(match[1]);
    if (cleaned && cleaned.length >= 4) {
      console.log('Found KM near keyword:', cleaned);
      return cleaned;
    }
  }

  // Also try single digit + km (e.g. rare case)
  var kmRegex2 = /(\d+)\s*km(?!\s*\/\s*h)\b/gi;
  while ((match = kmRegex2.exec(cleanText)) !== null) {
    var cleaned2 = cleanNumber(match[1]);
    if (cleaned2 && cleaned2.length >= 4) {
      console.log('Found KM near keyword (simple):', cleaned2);
      return cleaned2;
    }
  }

  // === PRIORITY 2: Numbers with decimals (typical odometer like 41895.4) ===
  var decimalRegex = /(\d[\d\s]*\d)\s*[.,]\s*(\d)/g;
  while ((match = decimalRegex.exec(filtered)) !== null) {
    var intPart = match[1].replace(/\s/g, '');
    if (intPart.length >= 4 && intPart.length <= 7 && !SPEED_NUMBERS[intPart]) {
      console.log('Found decimal odometer:', intPart);
      return intPart;
    }
  }

  // === PRIORITY 3: Longest number sequence (4-7 digits), filter out speedometer values ===
  // Handles OCR reading digits with spaces: "4 1 8 9 5 4"
  var spacedDigits = /(\d[\d\s]{3,10}\d)/g;
  while ((match = spacedDigits.exec(filtered)) !== null) {
    var numStr = match[1].replace(/\s/g, '');
    if (numStr.length >= 5 && numStr.length <= 7) {
      var num = parseInt(numStr, 10);
      if (!isNaN(num) && !SPEED_NUMBERS[numStr]) {
        numbers.push({ value: num, str: numStr, priority: 2 });
      }
    }
  }

  // Plain continuous numbers 4-7 digits
  var plainRegex = /(\d{4,7})/g;
  while ((match = plainRegex.exec(filtered)) !== null) {
    var numVal = parseInt(match[1], 10);
    if (!isNaN(numVal) && !SPEED_NUMBERS[match[1]] && !isLikelyYear(match[1])) {
      numbers.push({ value: numVal, str: match[1], priority: 1 });
    }
  }

  if (numbers.length === 0) {
    // Fallback: any 3+ digit number that's not a speedometer value or year
    var fallback = /(\d{3,})/g;
    while ((match = fallback.exec(filtered)) !== null) {
      var fVal = parseInt(match[1], 10);
      if (!isNaN(fVal) && fVal >= 100 && !SPEED_NUMBERS[match[1]] && !isLikelyYear(match[1])) {
        numbers.push({ value: fVal, str: match[1], priority: 0 });
      }
    }
  }

  if (numbers.length === 0) return null;

  // Remove duplicates
  var seen = {};
  numbers = numbers.filter(function (n) {
    if (seen[n.value]) return false;
    seen[n.value] = true;
    return true;
  });

  // Sort: higher priority first, then longer string, then larger value
  numbers.sort(function (a, b) {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.str.length !== a.str.length) return b.str.length - a.str.length;
    return b.value - a.value;
  });

  console.log('All detected numbers:', numbers.map(function (n) { return n.str + '(p' + n.priority + ')'; }));

  return numbers[0].value.toString();
}

/**
 * Clean a number string: remove spaces, handle decimal (keep integer part)
 */
function cleanNumber(str) {
  // Remove spaces
  var cleaned = str.replace(/\s/g, '');
  // Remove trailing decimal part (e.g. "41895.4" → "41895")
  cleaned = cleaned.replace(/[.,]\d*$/, '');
  // Remove any remaining non-digit chars
  cleaned = cleaned.replace(/[^\d]/g, '');
  return cleaned;
}

/**
 * Check if a number string looks like a year (2019-2030)
 */
function isLikelyYear(str) {
  if (str.length !== 4) return false;
  var num = parseInt(str, 10);
  return num >= 2019 && num <= 2035;
}
