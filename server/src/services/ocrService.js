const { createWorker } = require('tesseract.js');
const fs = require('fs');

/**
 * Perform OCR on an image file
 * @param {string} filePath - Absolute path to image file
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromImage = async (filePath) => {
  let worker = null;
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Receipt image file not found at ${filePath}`);
    }

    // Initialize Tesseract worker
    // Using eng+fra for receipts (covers both French and English receipts commonly found in Morocco/internationally)
    worker = await createWorker('eng+fra');
    
    const ret = await worker.recognize(filePath);
    await worker.terminate();

    return ret.data.text || '';
  } catch (error) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        // ignore
      }
    }
    console.error('Tesseract OCR error:', error.message);
    // If OCR fails, throw error or return empty string so caller can fallback
    throw error;
  }
};

module.exports = {
  extractTextFromImage
};
