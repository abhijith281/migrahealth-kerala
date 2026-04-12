const axios = require('axios');

exports.translateText = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    if (!targetLang || targetLang === 'en') {
      return res.status(200).json({ success: true, data: text });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      console.warn('Google Translate API key missing. Skipping translation.');
      return res.status(200).json({ success: true, data: text });
    }

    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        q: text,
        target: targetLang
      }
    );

    const translatedText = response.data.data.translations[0].translatedText;
    res.status(200).json({ success: true, data: translatedText });

  } catch (error) {
    console.error('Translation error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Translation failed', fallback: req.body.text });
  }
};

exports.translateBatch = async (req, res) => {
  try {
    const { texts, targetLang } = req.body;

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ success: false, error: 'Texts array is required' });
    }

    if (!targetLang || targetLang === 'en') {
      return res.status(200).json({ success: true, data: texts });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      console.warn('Google Translate API key missing. Skipping batch translation.');
      return res.status(200).json({ success: true, data: texts });
    }

    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        q: texts,
        target: targetLang
      }
    );

    const translatedTexts = response.data.data.translations.map(t => t.translatedText);
    res.status(200).json({ success: true, data: translatedTexts });

  } catch (error) {
    console.error('Batch translation error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Translation failed', fallback: req.body.texts });
  }
};
