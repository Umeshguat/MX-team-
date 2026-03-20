import * as FileSystem from 'expo-file-system';
import { OCR_API_KEY } from '../config';

/**
 * Extract KM reading from an odometer image using OCR.space free API
 * @param {string} imageUri - local file URI of the image
 * @returns {Promise<string|null>} - extracted KM number or null
 */
export async function extractKmFromImage(imageUri) {
  try {
    // Read image as base64
    var base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call OCR.space free API
    var formData = new FormData();
    formData.append('base64Image', 'data:image/jpg;base64,' + base64Image);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');

    var response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': OCR_API_KEY,
      },
      body: formData,
    });

    var result = await response.json();
    console.log('OCR response:', JSON.stringify(result));

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      var fullText = result.ParsedResults[0].ParsedText || '';
      console.log('OCR full text:', fullText);

      if (result.ParsedResults[0].ErrorMessage) {
        console.log('OCR error:', result.ParsedResults[0].ErrorMessage);
        return null;
      }

      // Extract KM reading
      var kmNumber = extractBestKmReading(fullText);
      console.log('Extracted KM:', kmNumber);
      return kmNumber;
    }

    if (result.ErrorMessage) {
      console.log('OCR API error:', result.ErrorMessage);
    }

    return null;
  } catch (err) {
    console.log('OCR error:', err);
    return null;
  }
}

/**
 * Extract the best KM reading from OCR text
 * Looks for the largest multi-digit number (odometer readings are typically 5-7 digits)
 */
function extractBestKmReading(text) {
  if (!text) return null;

  // Clean text - remove newlines, extra spaces
  var cleanText = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
  console.log('Clean OCR text:', cleanText);

  // Remove common non-KM text like "km", "km/h", speed numbers near "km/h"
  var textWithoutSpeed = cleanText.replace(/\d+\s*km\/h/gi, '');

  // Find all numbers (including those with spaces between digits from OCR)
  var numbers = [];
  var match;

  // Pattern 1: Numbers with possible spaces between digits (OCR artifact)
  var regex1 = /(\d[\d\s]*\d)/g;
  while ((match = regex1.exec(textWithoutSpeed)) !== null) {
    var numStr = match[1].replace(/\s/g, '');
    var num = parseInt(numStr, 10);
    if (!isNaN(num) && numStr.length >= 4 && numStr.length <= 7) {
      numbers.push({ value: num, str: numStr });
    }
  }

  // Pattern 2: Plain numbers 4-7 digits
  var regex2 = /\b(\d{4,7})\b/g;
  while ((match = regex2.exec(textWithoutSpeed)) !== null) {
    var num2 = parseInt(match[1], 10);
    if (!isNaN(num2)) {
      numbers.push({ value: num2, str: match[1] });
    }
  }

  // Pattern 3: Numbers near "km" keyword (highest priority)
  var kmRegex = /(\d[\d\s]*\d)\s*km\b/gi;
  while ((match = kmRegex.exec(cleanText)) !== null) {
    var numStr3 = match[1].replace(/\s/g, '');
    var num3 = parseInt(numStr3, 10);
    if (!isNaN(num3) && numStr3.length >= 3) {
      // Give this high priority by returning immediately
      console.log('Found KM near keyword:', num3);
      return num3.toString();
    }
  }

  if (numbers.length === 0) {
    // Fallback: try any number with 3+ digits
    var regex3 = /(\d{3,})/g;
    while ((match = regex3.exec(cleanText)) !== null) {
      var num4 = parseInt(match[1], 10);
      if (!isNaN(num4) && num4 >= 100) {
        numbers.push({ value: num4, str: match[1] });
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

  // Sort by string length desc (longer = more likely odometer), then by value desc
  numbers.sort(function (a, b) {
    if (b.str.length !== a.str.length) return b.str.length - a.str.length;
    return b.value - a.value;
  });

  console.log('All detected numbers:', numbers.map(function (n) { return n.str; }));

  // Return the best match (longest number, likely odometer)
  return numbers[0].value.toString();
}
