# SIH25083 — MigraHealth Kerala
## Phase 6: Multilingual Support (Google Translate API)

> **What you build in this phase:**
> Patients can switch the entire UI to their preferred language —
> Malayalam, Hindi, Bengali, Tamil, Odia, or English.
> Health record content can be translated on demand.
> This is the AI/API feature that makes MigraHealth stand out.
> By the end, a Bengali-speaking migrant worker can use the app in Bengali.

---

## How It Works (Understand before coding)

```
User sets language preference (stored in their profile)
          ↓
Frontend reads language from AuthContext
          ↓
UI labels switch instantly (local translation file — no API call)
          ↓
For dynamic content (health record text, diagnoses):
  User clicks "Translate" button
          ↓
  Frontend calls your backend: POST /api/translate
          ↓
  Backend calls Google Translate API
          ↓
  Translated text returned and shown inline
```

Two-layer approach:
- **Static UI labels** → local JSON files (fast, free, no API)
- **Dynamic content** → Google Translate API on demand (only called when user clicks Translate)

---

## Get Your Google Translate API Key

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable **Cloud Translation API**
4. Go to **APIs & Services → Credentials → Create API Key**
5. Copy the key — add it to your `.env`:

```
GOOGLE_TRANSLATE_API_KEY=AIza...your_key_here
```

> Google gives $300 free credit for new accounts.
> Translation API costs ~$20 per 1 million characters.
> For a hackathon/demo, your usage will be near zero cost.

---

## New Files to Create

```
backend/
├── controllers/
│   └── translateController.js   ← NEW
├── routes/
│   └── translateRoutes.js       ← NEW

frontend/src/
├── i18n/
│   ├── index.js                 ← NEW (language context)
│   ├── en.js                    ← NEW
│   ├── ml.js                    ← NEW (Malayalam)
│   ├── hi.js                    ← NEW (Hindi)
│   ├── bn.js                    ← NEW (Bengali)
│   ├── ta.js                    ← NEW (Tamil)
│   └── or.js                    ← NEW (Odia)
├── context/
│   └── LanguageContext.jsx      ← NEW
├── components/
│   ├── LanguageSwitcher.jsx     ← NEW
│   └── TranslateButton.jsx      ← NEW
```

---

## Step 1 — Install Backend Dependency

```bash
cd backend
npm install axios
```

---

## Step 2 — Translate Controller (`controllers/translateController.js`)

```js
const axios = require('axios');

// @route   POST /api/translate
// @access  all authenticated users
exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        message: 'text and targetLanguage are required',
      });
    }

    // Supported target languages
    const supported = ['ml', 'hi', 'bn', 'ta', 'or', 'en'];
    if (!supported.includes(targetLanguage)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language. Supported: ${supported.join(', ')}`,
      });
    }

    // If already English and target is English, skip API call
    if (targetLanguage === 'en') {
      return res.status(200).json({ success: true, translatedText: text });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await axios.post(url, {
      q: text,
      target: targetLanguage,
      format: 'text',
    });

    const translatedText =
      response.data.data.translations[0].translatedText;

    res.status(200).json({ success: true, translatedText });
  } catch (error) {
    // If Google API fails, return original text gracefully
    console.error('Translation error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Translation service unavailable. Showing original text.',
    });
  }
};

// @route   POST /api/translate/batch
// @access  all authenticated users
// Translate multiple strings in one API call (cheaper and faster)
exports.translateBatch = async (req, res) => {
  try {
    const { texts, targetLanguage } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ success: false, message: 'texts array is required' });
    }

    if (targetLanguage === 'en') {
      return res.status(200).json({ success: true, translatedTexts: texts });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await axios.post(url, {
      q: texts,
      target: targetLanguage,
      format: 'text',
    });

    const translatedTexts = response.data.data.translations.map(
      (t) => t.translatedText
    );

    res.status(200).json({ success: true, translatedTexts });
  } catch (error) {
    console.error('Batch translation error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Translation service unavailable.',
    });
  }
};
```

---

## Step 3 — Translate Routes (`routes/translateRoutes.js`)

```js
const express = require('express');
const router = express.Router();
const { translateText, translateBatch } = require('../controllers/translateController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, translateText);
router.post('/batch', protect, translateBatch);

module.exports = router;
```

---

## Step 4 — Register in `server.js`

```js
app.use('/api/translate', require('./routes/translateRoutes'));
```

---

## Step 5 — Translation Files (Frontend)

### `frontend/src/i18n/en.js`
```js
export default {
  appName: 'MigraHealth Kerala',
  login: 'Login',
  register: 'Register',
  logout: 'Logout',
  dashboard: 'Dashboard',
  healthRecords: 'Health Records',
  appointments: 'Appointments',
  immunizations: 'Immunizations',
  myProfile: 'My Profile',
  welcome: 'Welcome',
  bookAppointment: 'Book Appointment',
  addRecord: 'Add Record',
  translate: 'Translate',
  translating: 'Translating...',
  showOriginal: 'Show Original',
  phone: 'Phone Number',
  password: 'Password',
  name: 'Full Name',
  reason: 'Reason for Visit',
  date: 'Date',
  timeSlot: 'Time Slot',
  status: 'Status',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noRecords: 'No records found.',
  noAppointments: 'No appointments found.',
  bloodGroup: 'Blood Group',
  allergies: 'Allergies',
  conditions: 'Chronic Conditions',
  emergencyContact: 'Emergency Contact',
  upcomingVaccines: 'Upcoming Vaccines',
  totalPatients: 'Total Patients',
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  selectLanguage: 'Select Language',
  switchLanguage: 'Switch Language',
  verified: 'Verified',
  selfReported: 'Self-reported',
  diagnosis: 'Diagnosis',
  medications: 'Medications',
  notes: 'Notes',
  facility: 'Facility',
  givenOn: 'Given on',
  nextDose: 'Next dose due',
  overdue: 'OVERDUE',
  dueSoon: 'DUE SOON',
};
```

### `frontend/src/i18n/ml.js` (Malayalam)
```js
export default {
  appName: 'മൈഗ്രാഹെൽത്ത് കേരള',
  login: 'ലോഗിൻ',
  register: 'രജിസ്റ്റർ',
  logout: 'ലോഗൗട്ട്',
  dashboard: 'ഡാഷ്ബോർഡ്',
  healthRecords: 'ആരോഗ്യ രേഖകൾ',
  appointments: 'അപ്പോയിന്റ്മെന്റുകൾ',
  immunizations: 'പ്രതിരോധ കുത്തിവയ്പ്പ്',
  myProfile: 'എന്റെ പ്രൊഫൈൽ',
  welcome: 'സ്വാഗതം',
  bookAppointment: 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക',
  addRecord: 'രേഖ ചേർക്കുക',
  translate: 'പരിഭാഷ',
  translating: 'പരിഭാഷ ചെയ്യുന്നു...',
  showOriginal: 'യഥാർത്ഥ കാണുക',
  phone: 'ഫോൺ നമ്പർ',
  password: 'പാസ്‌വേഡ്',
  name: 'പൂർണ്ണ നാമം',
  reason: 'സന്ദർശന കാരണം',
  date: 'തീയതി',
  timeSlot: 'സമയ സ്ലോട്ട്',
  status: 'സ്ഥിതി',
  pending: 'കാത്തിരിക്കുന്നു',
  confirmed: 'സ്ഥിരീകരിച്ചു',
  completed: 'പൂർത്തിയായി',
  cancelled: 'റദ്ദാക്കി',
  noRecords: 'രേഖകളൊന്നും കണ്ടെത്തിയില്ല.',
  noAppointments: 'അപ്പോയിന്റ്മെന്റുകളൊന്നും കണ്ടെത്തിയില്ല.',
  bloodGroup: 'രക്ത ഗ്രൂപ്പ്',
  allergies: 'അലർജികൾ',
  conditions: 'വിട്ടുമാറാത്ത രോഗങ്ങൾ',
  emergencyContact: 'അടിയന്തര ബന്ധപ്പെടൽ',
  upcomingVaccines: 'വരാനിരിക്കുന്ന വാക്സിനുകൾ',
  totalPatients: 'ആകെ രോഗികൾ',
  loading: 'ലോഡ് ചെയ്യുന്നു...',
  save: 'സേവ് ചെയ്യുക',
  cancel: 'റദ്ദാക്കുക',
  confirm: 'സ്ഥിരീകരിക്കുക',
  selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
  switchLanguage: 'ഭാഷ മാറ്റുക',
  verified: 'സ്ഥിരീകരിച്ചത്',
  selfReported: 'സ്വയം റിപ്പോർട്ട് ചെയ്തത്',
  diagnosis: 'രോഗ നിർണ്ണയം',
  medications: 'മരുന്നുകൾ',
  notes: 'കുറിപ്പുകൾ',
  facility: 'ആശുപത്രി',
  givenOn: 'നൽകിയ തീയതി',
  nextDose: 'അടുത്ത ഡോസ്',
  overdue: 'കഴിഞ്ഞുപോയി',
  dueSoon: 'ഉടൻ',
};
```

### `frontend/src/i18n/hi.js` (Hindi)
```js
export default {
  appName: 'माइग्राहेल्थ केरला',
  login: 'लॉग इन',
  register: 'रजिस्टर',
  logout: 'लॉग आउट',
  dashboard: 'डैशबोर्ड',
  healthRecords: 'स्वास्थ्य रिकॉर्ड',
  appointments: 'अपॉइंटमेंट',
  immunizations: 'टीकाकरण',
  myProfile: 'मेरी प्रोफाइल',
  welcome: 'स्वागत है',
  bookAppointment: 'अपॉइंटमेंट बुक करें',
  addRecord: 'रिकॉर्ड जोड़ें',
  translate: 'अनुवाद करें',
  translating: 'अनुवाद हो रहा है...',
  showOriginal: 'मूल दिखाएं',
  phone: 'फोन नंबर',
  password: 'पासवर्ड',
  name: 'पूरा नाम',
  reason: 'कारण',
  date: 'तारीख',
  timeSlot: 'समय',
  status: 'स्थिति',
  pending: 'लंबित',
  confirmed: 'पुष्टि हुई',
  completed: 'पूर्ण',
  cancelled: 'रद्द',
  noRecords: 'कोई रिकॉर्ड नहीं मिला।',
  noAppointments: 'कोई अपॉइंटमेंट नहीं मिली।',
  bloodGroup: 'रक्त समूह',
  allergies: 'एलर्जी',
  conditions: 'पुरानी बीमारियाँ',
  emergencyContact: 'आपातकालीन संपर्क',
  upcomingVaccines: 'आगामी टीके',
  totalPatients: 'कुल मरीज़',
  loading: 'लोड हो रहा है...',
  save: 'सहेजें',
  cancel: 'रद्द करें',
  confirm: 'पुष्टि करें',
  selectLanguage: 'भाषा चुनें',
  switchLanguage: 'भाषा बदलें',
  verified: 'सत्यापित',
  selfReported: 'स्व-रिपोर्ट',
  diagnosis: 'निदान',
  medications: 'दवाइयाँ',
  notes: 'नोट्स',
  facility: 'अस्पताल',
  givenOn: 'दिया गया',
  nextDose: 'अगली खुराक',
  overdue: 'अतिदेय',
  dueSoon: 'जल्द देय',
};
```

### `frontend/src/i18n/bn.js` (Bengali)
```js
export default {
  appName: 'মাইগ্রাহেলথ কেরালা',
  login: 'লগ ইন',
  register: 'নিবন্ধন',
  logout: 'লগ আউট',
  dashboard: 'ড্যাশবোর্ড',
  healthRecords: 'স্বাস্থ্য রেকর্ড',
  appointments: 'অ্যাপয়েন্টমেন্ট',
  immunizations: 'টিকাদান',
  myProfile: 'আমার প্রোফাইল',
  welcome: 'স্বাগতম',
  bookAppointment: 'অ্যাপয়েন্টমেন্ট বুক করুন',
  addRecord: 'রেকর্ড যোগ করুন',
  translate: 'অনুবাদ করুন',
  translating: 'অনুবাদ হচ্ছে...',
  showOriginal: 'মূল দেখুন',
  phone: 'ফোন নম্বর',
  password: 'পাসওয়ার্ড',
  name: 'পুরো নাম',
  reason: 'কারণ',
  date: 'তারিখ',
  timeSlot: 'সময়',
  status: 'অবস্থা',
  pending: 'অপেক্ষমাণ',
  confirmed: 'নিশ্চিত',
  completed: 'সম্পন্ন',
  cancelled: 'বাতিল',
  noRecords: 'কোনো রেকর্ড পাওয়া যায়নি।',
  noAppointments: 'কোনো অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।',
  bloodGroup: 'রক্তের গ্রুপ',
  allergies: 'অ্যালার্জি',
  conditions: 'দীর্ঘস্থায়ী রোগ',
  emergencyContact: 'জরুরি যোগাযোগ',
  upcomingVaccines: 'আসন্ন টিকা',
  totalPatients: 'মোট রোগী',
  loading: 'লোড হচ্ছে...',
  save: 'সংরক্ষণ',
  cancel: 'বাতিল',
  confirm: 'নিশ্চিত করুন',
  selectLanguage: 'ভাষা নির্বাচন করুন',
  switchLanguage: 'ভাষা পরিবর্তন করুন',
  verified: 'যাচাইকৃত',
  selfReported: 'স্ব-রিপোর্ট',
  diagnosis: 'রোগ নির্ণয়',
  medications: 'ওষুধ',
  notes: 'নোট',
  facility: 'হাসপাতাল',
  givenOn: 'দেওয়া হয়েছে',
  nextDose: 'পরবর্তী ডোজ',
  overdue: 'মেয়াদোত্তীর্ণ',
  dueSoon: 'শীঘ্রই প্রাপ্য',
};
```

### `frontend/src/i18n/ta.js` (Tamil)
```js
export default {
  appName: 'மைக்ராஹெல்த் கேரளா',
  login: 'உள்நுழை',
  register: 'பதிவு செய்',
  logout: 'வெளியேறு',
  dashboard: 'டாஷ்போர்டு',
  healthRecords: 'சுகாதார பதிவுகள்',
  appointments: 'சந்திப்புகள்',
  immunizations: 'தடுப்பூசி',
  myProfile: 'என் சுயவிவரம்',
  welcome: 'வரவேற்கிறோம்',
  bookAppointment: 'சந்திப்பு பதிவு செய்',
  addRecord: 'பதிவு சேர்',
  translate: 'மொழிபெயர்',
  translating: 'மொழிபெயர்க்கிறது...',
  showOriginal: 'மூலம் காட்டு',
  phone: 'தொலைபேசி எண்',
  password: 'கடவுச்சொல்',
  name: 'முழு பெயர்',
  reason: 'காரணம்',
  date: 'தேதி',
  timeSlot: 'நேரம்',
  status: 'நிலை',
  pending: 'நிலுவையில்',
  confirmed: 'உறுதிப்படுத்தப்பட்டது',
  completed: 'முடிந்தது',
  cancelled: 'ரத்து செய்யப்பட்டது',
  noRecords: 'பதிவுகள் எதுவும் இல்லை.',
  noAppointments: 'சந்திப்புகள் எதுவும் இல்லை.',
  bloodGroup: 'இரத்த வகை',
  allergies: 'ஒவ்வாமைகள்',
  conditions: 'நீண்டகால நோய்கள்',
  emergencyContact: 'அவசர தொடர்பு',
  upcomingVaccines: 'வரவிருக்கும் தடுப்பூசிகள்',
  totalPatients: 'மொத்த நோயாளிகள்',
  loading: 'ஏற்றுகிறது...',
  save: 'சேமி',
  cancel: 'ரத்து செய்',
  confirm: 'உறுதிப்படுத்து',
  selectLanguage: 'மொழியை தேர்வு செய்',
  switchLanguage: 'மொழி மாற்று',
  verified: 'சரிபார்க்கப்பட்டது',
  selfReported: 'சுய-அறிக்கை',
  diagnosis: 'நோய் கண்டறிதல்',
  medications: 'மருந்துகள்',
  notes: 'குறிப்புகள்',
  facility: 'மருத்துவமனை',
  givenOn: 'வழங்கிய தேதி',
  nextDose: 'அடுத்த டோஸ்',
  overdue: 'தாமதமானது',
  dueSoon: 'விரைவில் நிலுவை',
};
```

### `frontend/src/i18n/or.js` (Odia)
```js
export default {
  appName: 'ମାଇଗ୍ରାହେଲ୍ଥ କେରଳ',
  login: 'ଲଗ ଇନ',
  register: 'ପଞ୍ଜୀକରଣ',
  logout: 'ଲଗ ଆଉଟ',
  dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
  healthRecords: 'ସ୍ୱାସ୍ଥ୍ୟ ରେକର୍ଡ',
  appointments: 'ଅ୍ୟାପଏଣ୍ଟମେଣ୍ଟ',
  immunizations: 'ଟୀକାକରଣ',
  myProfile: 'ମୋ ପ୍ରୋଫାଇଲ',
  welcome: 'ସ୍ୱାଗତ',
  bookAppointment: 'ଅ୍ୟାପଏଣ୍ଟମେଣ୍ଟ ବୁକ କରନ୍ତୁ',
  addRecord: 'ରେକର୍ଡ ଯୋଡନ୍ତୁ',
  translate: 'ଅନୁବାଦ',
  translating: 'ଅନୁବାଦ ହେଉଛି...',
  showOriginal: 'ମୂଳ ଦେଖନ୍ତୁ',
  phone: 'ଫୋନ ନମ୍ବର',
  password: 'ପାସୱାର୍ଡ',
  name: 'ପୂରା ନାମ',
  reason: 'କାରଣ',
  date: 'ତାରିଖ',
  timeSlot: 'ସମୟ',
  status: 'ସ୍ଥିତି',
  pending: 'ବିଚାରାଧୀନ',
  confirmed: 'ନିଶ୍ଚିତ',
  completed: 'ସମ୍ପୂର୍ଣ୍ଣ',
  cancelled: 'ବାତିଲ',
  noRecords: 'କୌଣସି ରେକର୍ଡ ମିଳିଲା ନାହିଁ।',
  noAppointments: 'କୌଣସି ଅ୍ୟାପଏଣ୍ଟମେଣ୍ଟ ମିଳିଲା ନାହିଁ।',
  bloodGroup: 'ରକ୍ତ ଗ୍ରୁପ',
  allergies: 'ଆଲର୍ଜି',
  conditions: 'ଦୀର୍ଘ ରୋଗ',
  emergencyContact: 'ଜରୁରୀ ଯୋଗାଯୋଗ',
  upcomingVaccines: 'ଆସନ୍ତା ଟୀକା',
  totalPatients: 'ମୋଟ ରୋଗୀ',
  loading: 'ଲୋଡ ହେଉଛି...',
  save: 'ସଂରକ୍ଷଣ',
  cancel: 'ବାତିଲ',
  confirm: 'ନିଶ୍ଚିତ',
  selectLanguage: 'ଭାଷା ବାଛନ୍ତୁ',
  switchLanguage: 'ଭାଷା ପରିବର୍ତ୍ତନ',
  verified: 'ଯାଞ୍ଚ ହୋଇଛି',
  selfReported: 'ସ୍ୱ-ରିପୋର୍ଟ',
  diagnosis: 'ରୋଗ ନିର୍ଣ୍ଣୟ',
  medications: 'ଔଷଧ',
  notes: 'ଟିପ୍ପଣୀ',
  facility: 'ଡାକ୍ତରଖାନା',
  givenOn: 'ଦିଆ ହୋଇଛି',
  nextDose: 'ପରବର୍ତ୍ତୀ ଡୋଜ',
  overdue: 'ଅତ୍ୟଧିକ ବିଳମ୍ବ',
  dueSoon: 'ଶୀଘ୍ର ଦେୟ',
};
```

### `frontend/src/i18n/index.js`
```js
import en from './en';
import ml from './ml';
import hi from './hi';
import bn from './bn';
import ta from './ta';
import or from './or';

export const translations = { en, ml, hi, bn, ta, or };

export const languageOptions = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
];
```

---

## Step 6 — Language Context (`context/LanguageContext.jsx`)

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n';
import { useAuth } from './AuthContext';
import API from '../api/axios';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();

  // Default to user's language preference, fallback to localStorage, then 'en'
  const [language, setLanguage] = useState(
    () => localStorage.getItem('migrahealth_lang') || 'en'
  );

  // Sync language from user profile when user logs in
  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
      localStorage.setItem('migrahealth_lang', user.language);
    }
  }, [user]);

  const changeLanguage = async (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('migrahealth_lang', langCode);

    // Persist to user profile in background
    try {
      await API.put('/patients/profile', { language: langCode });
    } catch {
      // Non-critical — local change still works even if API fails
    }
  };

  // t() is the translation function — use it everywhere
  const t = (key) => translations[language]?.[key] || translations['en'][key] || key;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
```

---

## Step 7 — Wrap App with LanguageProvider (`main.jsx`)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);
```

---

## Step 8 — Language Switcher Component (`components/LanguageSwitcher.jsx`)

```jsx
import { useLanguage } from '../context/LanguageContext';
import { languageOptions } from '../i18n';

export default function LanguageSwitcher({ compact = false }) {
  const { language, changeLanguage, t } = useLanguage();

  if (compact) {
    // Dropdown version for navbar
    return (
      <select
        value={language}
        onChange={e => changeLanguage(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid #ddd',
          fontSize: 13,
          cursor: 'pointer',
          background: 'transparent',
        }}
        title={t('switchLanguage')}
      >
        {languageOptions.map(opt => (
          <option key={opt.code} value={opt.code}>
            {opt.nativeLabel}
          </option>
        ))}
      </select>
    );
  }

  // Button group version for profile/settings
  return (
    <div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{t('selectLanguage')}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {languageOptions.map(opt => (
          <button
            key={opt.code}
            onClick={() => changeLanguage(opt.code)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid #ddd',
              background: language === opt.code ? '#343a40' : 'transparent',
              color: language === opt.code ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {opt.nativeLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 9 — Translate Button Component (`components/TranslateButton.jsx`)

```jsx
import { useState } from 'react';
import API from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

export default function TranslateButton({ text, onTranslated }) {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [originalText] = useState(text);

  // Don't show button if language is English (already in English)
  if (language === 'en') return null;

  const handleTranslate = async () => {
    if (translated) {
      // Toggle back to original
      onTranslated(originalText);
      setTranslated(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post('/translate', {
        text,
        targetLanguage: language,
      });
      onTranslated(data.translatedText);
      setTranslated(true);
    } catch {
      // Silently fail — don't block the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTranslate}
      disabled={loading}
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 10,
        border: '1px solid #ddd',
        background: translated ? '#d1ecf1' : 'transparent',
        color: translated ? '#0c5460' : '#666',
        cursor: 'pointer',
        marginLeft: 8,
      }}
    >
      {loading ? t('translating') : translated ? t('showOriginal') : t('translate')}
    </button>
  );
}
```

---

## Step 10 — Use `t()` in Existing Pages

Now update your existing pages to use translations.
Here is the pattern — apply it to all pages:

### In any component:
```jsx
import { useLanguage } from '../context/LanguageContext';

export default function HealthRecords() {
  const { t } = useLanguage();
  // ...

  return (
    <div>
      <h2>{t('healthRecords')}</h2>
      {records.length === 0 && <p>{t('noRecords')}</p>}
      {/* etc */}
    </div>
  );
}
```

### Add TranslateButton to HealthRecordCard:

```jsx
import TranslateButton from './TranslateButton';

function HealthRecordCard({ record }) {
  const [displayDiagnosis, setDisplayDiagnosis] = useState(record.diagnosis || '');
  const [displayDescription, setDisplayDescription] = useState(record.description || '');

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <strong>{record.title}</strong>

      {record.diagnosis && (
        <p style={{ fontSize: 14, margin: '6px 0' }}>
          <strong>Diagnosis:</strong> {displayDiagnosis}
          <TranslateButton
            text={record.diagnosis}
            onTranslated={setDisplayDiagnosis}
          />
        </p>
      )}

      {record.description && (
        <p style={{ fontSize: 14, margin: '6px 0' }}>
          {displayDescription}
          <TranslateButton
            text={record.description}
            onTranslated={setDisplayDescription}
          />
        </p>
      )}
    </div>
  );
}
```

### Add Language Switcher to Dashboard navbar:

```jsx
import LanguageSwitcher from '../components/LanguageSwitcher';

// In the header div of Dashboard.jsx:
<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
  <LanguageSwitcher compact={true} />
  <button onClick={logout}>Logout</button>
</div>
```

---

## Step 11 — Update Login Page to Use Translations

```jsx
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t } = useLanguage();
  // ...

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>{t('appName')}</h2>
        <LanguageSwitcher compact={true} />
      </div>

      <form onSubmit={handleSubmit}>
        <input placeholder={t('phone')} /* ... */ />
        <input type="password" placeholder={t('password')} /* ... */ />
        <button type="submit">{t('login')}</button>
      </form>

      <p>No account? <a href="/register">{t('register')}</a></p>
    </div>
  );
}
```

---

## Test Your Phase 6

### 1. Test translation API directly
```
POST http://localhost:5000/api/translate
Body:
{
  "text": "Fever and headache for 3 days, prescribed rest and paracetamol",
  "targetLanguage": "ml"
}
```
Expected: Malayalam translation returned

### 2. Test batch translation
```
POST http://localhost:5000/api/translate/batch
Body:
{
  "texts": ["Fever", "Take rest for 2 days", "Paracetamol 500mg"],
  "targetLanguage": "hi"
}
```
Expected: Array of 3 Hindi translations

### 3. Test English → English (no API call made)
```
POST http://localhost:5000/api/translate
Body: { "text": "Hello", "targetLanguage": "en" }
```
Expected: Same text returned immediately, no Google API call

### 4. Frontend — switch to Malayalam
- Open the app, click language switcher, select മലയാളം
- Expected: All UI labels switch to Malayalam instantly
- Health Records page title should read: ആരോഗ്യ രേഖകൾ

### 5. Frontend — translate a health record
- Switch to Hindi (हिंदी)
- Open a health record with a diagnosis written in English
- Click "अनुवाद करें" button next to the diagnosis
- Expected: Diagnosis text changes to Hindi
- Click "मूल दिखाएं" to toggle back

### 6. Verify language persists on refresh
- Switch to Bengali
- Refresh the page
- Expected: Language stays Bengali (localStorage)

---

## Phase 6 Checklist

- [ ] Google Translate API key added to `.env`
- [ ] `/api/translate` returns translation for ml, hi, bn, ta, or
- [ ] English → English returns original text without calling Google API
- [ ] Batch translate endpoint works with array of strings
- [ ] All 6 translation files created with correct keys
- [ ] Language switcher (compact dropdown) appears in Dashboard and Login navbars
- [ ] Switching language changes UI labels instantly — no page reload
- [ ] `t('healthRecords')` etc. works in at least 3 pages
- [ ] TranslateButton appears on health record diagnosis/description fields
- [ ] Clicking TranslateButton translates content to selected language
- [ ] Clicking again toggles back to original English text
- [ ] Selected language persists after page refresh (localStorage)
- [ ] Language preference saved to user profile via API

---

## What's Next — Phase 7

You will build:
- Admin dashboard
- Assign doctors to patients
- View all users, records, and system-wide stats
- Simple analytics: records per month, patients per district

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| Two-layer translation (local JSON + API) | Static labels are instant and free — API only called for dynamic medical content when user explicitly requests it |
| `t()` function pattern | Standard i18n pattern used in production apps (same as react-i18next). Shows awareness of industry conventions |
| Language stored in localStorage + user profile | localStorage for instant load on refresh; profile for cross-device persistence — two different problems solved together |
| Translate only on user click | Medical text should never be auto-translated without consent — mistranslation in healthcare is dangerous. User-initiated translation is safer |
| Batch endpoint for multiple strings | One API call instead of N calls — reduces latency and API cost when translating a page with multiple fields |
| Graceful failure in translate controller | If Google API is down, return 500 but the frontend shows original text — the app never breaks because of translation failure |
| `targetLanguage: 'en'` short-circuits | Saves an unnecessary external API call — shows you think about efficiency |
