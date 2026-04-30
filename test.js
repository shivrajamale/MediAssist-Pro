const chatMessages = { appendChild: () => {}, querySelectorAll: () => [] };
const chatForm = {};
const userInput = {};
const quickButtons = [];
const selectionButtons = [];
const selectionActions = { classList: { add: () => {}, remove: () => {} } };
const severityRow = { classList: { add: () => {}, remove: () => {} } };
const typeRow = { classList: { add: () => {}, remove: () => {} } };
const robotLauncher = {};
const chatShell = {};

let pendingDisease = null;
let pendingSeverity = null;
let userName = null;
let userAge = null;
let userAllergies = null;
let userCurrentMeds = null;
let waitingForSmartConfirm = null;

/* ---------------- CHAT MEMORY ---------------- */

const chatMemory = {
  symptoms: [],
  diseases: [],
  lastVisits: [],
  notes: [],

  rememberSymptom(symptom) {
    if (symptom && !this.symptoms.includes(symptom)) {
      this.symptoms.push(symptom);
    }
  },

  rememberDisease(disease) {
    if (disease && !this.diseases.includes(disease)) {
      this.diseases.push(disease);
      this.lastVisits.push({ disease, date: new Date().toLocaleDateString() });
    }
  },

  rememberNote(note) {
    if (note) this.notes.push(note);
  },

  getHistory() {
    let history = "";
    if (this.diseases.length > 0) {
      history += `📋 Previous Diseases: ${this.diseases.join(", ")}\n`;
    }
    if (this.symptoms.length > 0) {
      history += `🩺 Previous Symptoms: ${this.symptoms.join(", ")}\n`;
    }
    if (this.lastVisits.length > 0) {
      const recent = this.lastVisits.slice(-3).map(v => `${v.disease} (${v.date})`).join(", ");
      history += `📅 Recent Visits: ${recent}\n`;
    }
    return history;
  },

  clear() {
    this.symptoms = [];
    this.diseases = [];
    this.lastVisits = [];
    this.notes = [];
  }
};

/* ---------------- SMART ANALYSIS ---------------- */

const symptomDB = {
  "Dengue Fever": {
    symptoms: ["fever", "headache", "body pain", "joint pain", "rash", "vomiting", "eye pain"],
    baseRisk: "High"
  },
  "Malaria": {
    symptoms: ["fever", "chills", "sweating", "headache", "nausea", "vomiting", "body pain"],
    baseRisk: "High"
  },
  "Common Cold": {
    symptoms: ["fever", "runny nose", "sneezing", "cough", "sore throat", "mild headache", "body ache", "body pain", "cold"],
    baseRisk: "Mild"
  },
  "Typhoid Fever": {
    symptoms: ["fever", "weakness", "stomach pain", "headache", "diarrhea", "constipation", "cough", "loss of appetite"],
    baseRisk: "Moderate"
  },
  "Food Poisoning": {
    symptoms: ["stomach pain", "nausea", "vomiting", "diarrhea", "fever", "weakness", "loose motion"],
    baseRisk: "Moderate"
  },
  "Headache": {
    symptoms: ["headache", "nausea", "sensitivity to light", "neck stiffness"],
    baseRisk: "Mild"
  },
  "Weakness": {
    symptoms: ["weakness", "fatigue", "dizziness", "pale skin"],
    baseRisk: "Mild"
  },
  "Fever": {
    symptoms: ["fever", "high temperature", "chills", "body heating"],
    baseRisk: "Moderate"
  }
};

function smartSymptomChecker(msg) {
  let matchedSymptoms = [];
  for (let d in symptomDB) {
    symptomDB[d].symptoms.forEach(sym => {
      if (msg.includes(sym) && !matchedSymptoms.includes(sym)) {
        matchedSymptoms.push(sym);
      }
    });
  }

  if (matchedSymptoms.length > 1) {
    let diseaseScores = {};
    for (let d in symptomDB) {
      let score = 0;
      symptomDB[d].symptoms.forEach(sym => {
        if (matchedSymptoms.includes(sym)) score++;
      });
      if (score > 0) diseaseScores[d] = score;
    }

    let sortedDiseases = Object.keys(diseaseScores).sort((a, b) => diseaseScores[b] - diseaseScores[a]);

    if (sortedDiseases.length > 0) {
      const topDisease = sortedDiseases[0];
      const riskLevel = symptomDB[topDisease].baseRisk;
      
      let reply = `🧠 Smart Analysis:\n\n`;
      reply += `📝 Detected Symptoms: ${matchedSymptoms.join(", ")}\n`;
      reply += `🩺 Possible Diseases:\n`;
      
      sortedDiseases.slice(0, 3).forEach((d) => {
         let matchLevel = diseaseScores[d] >= 3 ? "High Match" : (diseaseScores[d] === 2 ? "Moderate Match" : "Low Match");
         reply += `  • ${d} (${matchLevel})\n`;
      });
      
      reply += `\n⚠️ General Risk Level: ${riskLevel}\n\n`;
      reply += `Would you like a care plan for ${topDisease}? (Type 'Yes' to continue, or select a specific disease above)`;

      matchedSymptoms.forEach(s => chatMemory.rememberSymptom(s));
      chatMemory.rememberDisease(topDisease);

      return { topDisease, reply };
    }
  }
  return null;
}

/* ---------------- UI FUNCTIONS ---------------- */

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatAssistantMessage(text) {
  return text.split("\n").map(line => `<div>${escapeHtml(line)}</div>`).join("");
}

function addMessage(role, title, text) {
  const msg = document.createElement("article");
  msg.className = `message ${role}`;

  msg.innerHTML = `
    <h4>${title}</h4>
    <p>${role === "assistant" ? formatAssistantMessage(text) : escapeHtml(text)}</p>
  `;

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChat() {
  // Keep only the first welcome message, remove everything else
  const messages = chatMessages.querySelectorAll(".message");
  messages.forEach((msg, i) => {
    if (i > 0) msg.remove();
  });
}

/* ---------------- SHOW/HIDE SELECTION ROWS ---------------- */

function hideAllSelections() {
  selectionActions.classList.add("hidden");
  severityRow.classList.add("hidden");
  typeRow.classList.add("hidden");
}

function showSeverityRow() {
  selectionActions.classList.remove("hidden");
  severityRow.classList.remove("hidden");
  typeRow.classList.add("hidden");
}

function showTypeRow() {
  selectionActions.classList.remove("hidden");
  severityRow.classList.add("hidden");
  typeRow.classList.remove("hidden");
}

/* ---------------- MEDICINE DATABASE ---------------- */

const medicineDB = {
  "Fever": {
    mild: {
      tablets: ["Paracetamol (Dolo 650) – 1 tablet every 6 hrs", "Crocin 500mg – if temp above 100°F"],
      homeCare: "Drink warm fluids, rest well, use a damp cloth on forehead",
      warning: "Visit doctor if fever persists beyond 3 days"
    },
    moderate: {
      tablets: ["Paracetamol (Dolo 650) – 1 tablet every 6 hrs", "Ibuprofen 400mg – if body pain present", "ORS sachets – to prevent dehydration"],
      homeCare: "Complete bed rest, stay hydrated, light meals only",
      warning: "Visit doctor if temp exceeds 103°F or rash appears"
    },
    high: {
      tablets: ["Paracetamol (Dolo 650) – 1 tablet every 4-6 hrs", "Ibuprofen 400mg – alternate with paracetamol", "ORS sachets – essential for hydration"],
      homeCare: "Ice packs on forehead and armpits, sponge bath with lukewarm water",
      warning: "⚠️ SEEK IMMEDIATE MEDICAL HELP if temp exceeds 104°F, seizures, or confusion"
    }
  },
  "Common Cold": {
    mild: {
      tablets: ["Cetirizine 10mg – 1 tablet at night", "Nasivion nasal drops – for blocked nose"],
      homeCare: "Steam inhalation, warm water gargle, honey + ginger tea",
      warning: "Visit doctor if symptoms last more than 7 days"
    },
    moderate: {
      tablets: ["Cetirizine 10mg – 1 tablet at night", "Sinarest tablet – for cold + headache", "Otrivin nasal spray – for congestion"],
      homeCare: "Steam inhalation 3 times a day, avoid cold drinks, rest well",
      warning: "Visit doctor if greenish mucus or ear pain develops"
    },
    high: {
      tablets: ["Levocetirizine 5mg – 1 tablet daily", "Sinarest tablet – twice daily", "Ambroxol syrup – for chest congestion", "Vitamin C 500mg – daily for immunity"],
      homeCare: "Complete rest, hot soups, steam with eucalyptus oil",
      warning: "⚠️ Visit doctor immediately if breathing difficulty or chest pain"
    }
  },
  "Dengue Fever": {
    mild: {
      tablets: ["Paracetamol (Dolo 650) – only for fever", "ORS sachets – 2-3 litres fluid daily", "⛔ Do NOT take Aspirin or Ibuprofen"],
      homeCare: "Drink papaya leaf juice, coconut water, complete bed rest",
      warning: "Get platelet count checked daily. Visit doctor if count drops below 1 lakh"
    },
    moderate: {
      tablets: ["Paracetamol (Dolo 650) – every 6 hrs for fever", "ORS sachets – essential", "Iron + Folic acid tablets – if platelets dropping", "⛔ Do NOT take Aspirin, Ibuprofen or Brufen"],
      homeCare: "Papaya leaf extract, goat milk, pomegranate juice to boost platelets",
      warning: "⚠️ Hospitalization may be needed. Monitor platelet count twice daily"
    },
    high: {
      tablets: ["Paracetamol only – strictly no painkillers", "IV fluids may be needed – hospital care", "⛔ AVOID Aspirin, Ibuprofen, Diclofenac"],
      homeCare: "Hospital admission recommended, continuous hydration",
      warning: "⚠️ EMERGENCY: Seek hospital immediately if bleeding, severe abdominal pain, or persistent vomiting"
    }
  },
  "Malaria": {
    mild: {
      tablets: ["Chloroquine 500mg – as per doctor schedule", "Paracetamol (Dolo 650) – for fever", "ORS sachets – stay hydrated"],
      homeCare: "Bed rest, light meals, keep mosquito net",
      warning: "Complete the full course of anti-malarial medicine"
    },
    moderate: {
      tablets: ["Chloroquine 500mg – day 1, 2, 3 schedule", "Primaquine 15mg – 14-day course", "Paracetamol – for fever control", "ORS + electrolyte drinks"],
      homeCare: "Strict bed rest, high-protein diet, avoid cold foods",
      warning: "⚠️ Visit doctor if vomiting prevents oral medication"
    },
    high: {
      tablets: ["Artesunate injection – hospital setting only", "IV fluids – essential", "Paracetamol – for fever management"],
      homeCare: "Hospital admission required for severe malaria",
      warning: "⚠️ EMERGENCY: Seek hospital immediately. Severe malaria can be life-threatening"
    }
  },
  "Typhoid Fever": {
    mild: {
      tablets: ["Azithromycin 500mg – 1 tablet daily for 7 days", "Paracetamol (Dolo 650) – for fever", "ORS sachets – stay hydrated", "Probiotics – to protect gut"],
      homeCare: "Boiled water only, light diet (khichdi, dal), complete rest",
      warning: "Get Widal test done. Complete full antibiotic course"
    },
    moderate: {
      tablets: ["Cefixime 200mg – twice daily for 10-14 days", "Paracetamol – for fever", "ORS sachets – essential", "Probiotics – daily with antibiotics"],
      homeCare: "Strict bed rest, boiled/filtered water, avoid outside food",
      warning: "⚠️ Visit doctor if fever doesn't reduce in 5 days of antibiotics"
    },
    high: {
      tablets: ["Ceftriaxone injection – hospital setting", "IV antibiotics + IV fluids", "Paracetamol – fever control"],
      homeCare: "Hospital admission recommended for severe typhoid",
      warning: "⚠️ EMERGENCY: Seek hospital if intestinal bleeding or confusion occurs"
    }
  },
  "Food Poisoning": {
    mild: {
      tablets: ["ORS sachets – after every loose motion", "Racecadotril 100mg – to stop diarrhea", "Ondem 4mg (Ondansetron) – if vomiting"],
      homeCare: "BRAT diet (banana, rice, applesauce, toast), sip water frequently",
      warning: "Visit doctor if symptoms last more than 24 hours"
    },
    moderate: {
      tablets: ["ORS sachets – essential after every episode", "Racecadotril 100mg – 3 times daily", "Ondem 4mg – before meals if vomiting", "Norfloxacin 400mg – if bacterial cause suspected"],
      homeCare: "Clear liquids only for 6-12 hrs, then light foods, avoid dairy",
      warning: "⚠️ Visit doctor if blood in stool or high fever develops"
    },
    high: {
      tablets: ["IV fluids – hospital setting for severe dehydration", "Ciprofloxacin 500mg – if bacterial", "Ondem injection – for uncontrollable vomiting"],
      homeCare: "Hospital visit needed if unable to keep liquids down",
      warning: "⚠️ EMERGENCY: Seek hospital immediately if signs of severe dehydration (no urine, dizziness)"
    }
  },
  "Headache": {
    mild: {
      tablets: ["Paracetamol 500mg – 1 tablet as needed", "Disprin (Aspirin) – for tension headache"],
      homeCare: "Rest in dark room, apply balm on forehead, stay hydrated",
      warning: "Visit doctor if headaches occur daily for over a week"
    },
    moderate: {
      tablets: ["Ibuprofen 400mg – 1 tablet with food", "Paracetamol 650mg – alternate option", "Saridon – for quick relief from headache"],
      homeCare: "Reduce screen time, sleep 7-8 hrs, cold compress on forehead",
      warning: "Visit doctor if headache worsens with neck stiffness or fever"
    },
    high: {
      tablets: ["Sumatriptan 50mg – for migraine (prescription only)", "Ibuprofen 400mg + Paracetamol 500mg – combo", "Domperidone 10mg – if nausea with headache"],
      homeCare: "Complete rest in dark, quiet room, avoid triggers (light, noise, stress)",
      warning: "⚠️ SEEK IMMEDIATE HELP if sudden severe headache, vision changes, or confusion"
    }
  },
  "Weakness": {
    mild: {
      tablets: ["Becosules capsule – daily multivitamin", "Iron + Folic Acid tablet – if anemia suspected", "ORS sachets – for energy boost"],
      homeCare: "Balanced diet with fruits, eggs, milk; sleep 7-8 hrs",
      warning: "Get CBC blood test if weakness persists beyond 5 days"
    },
    moderate: {
      tablets: ["Becosules Z – zinc + multivitamin daily", "Ferrous Sulphate 200mg – for iron deficiency", "Vitamin D3 60K – once a week", "ORS sachets – stay hydrated"],
      homeCare: "Protein-rich diet (eggs, paneer, dal), light exercise, proper sleep",
      warning: "⚠️ Visit doctor for blood tests (CBC, thyroid, vitamin levels)"
    },
    high: {
      tablets: ["Iron Sucrose IV – if severe anemia (hospital)", "Vitamin B12 injection – if deficiency confirmed", "Multivitamin drip – hospital setting"],
      homeCare: "Hospital evaluation needed for severe unexplained weakness",
      warning: "⚠️ SEEK MEDICAL HELP if fainting, rapid heartbeat, or breathlessness"
    }
  }
};

/* ---------------- CHAT LOGIC ---------------- */

function medicinePlan(disease, severity, type) {
  const info = medicineDB[disease]?.[severity];

  if (!info) {
    return `Assessment: ${disease} (${severity}, ${type})\nSolution: Rest + Hydration\nTablet: Consult doctor before taking medicines\nNext Step: Monitor symptoms for 2-3 days`;
  }

  const tabletList = info.tablets.map(t => {
    let isAllergic = false;
    if (userAllergies && userAllergies.toLowerCase() !== "none") {
      const allergyWords = userAllergies.toLowerCase().split(/[\s,]+/);
      const ignoreWords = ["yes", "no", "i", "am", "allergic", "to", "and", "or", "have", "drug", "medicine", "meds"];
      const activeAllergies = allergyWords.filter(w => w.length > 2 && !ignoreWords.includes(w));
      
      for (let w of activeAllergies) {
        if (t.toLowerCase().includes(w)) isAllergic = true;
        // Common brand name mappings
        if (w === "paracetamol" && (t.toLowerCase().includes("dolo") || t.toLowerCase().includes("crocin") || t.toLowerCase().includes("sinarest"))) isAllergic = true;
        if (w === "ibuprofen" && t.toLowerCase().includes("brufen")) isAllergic = true;
        if (w === "aspirin" && t.toLowerCase().includes("disprin")) isAllergic = true;
      }
    }
    
    if (isAllergic) {
      // Show warning instead of the normal tablet dosage
      return `  ⛔ [ALLERGY ALERT] Do NOT take: ${t.split("–")[0].trim()}`;
    }
    return `  • ${t}`;
  }).join("\n");
  const patientName = userName ? userName : "Patient";
  const patientAge = userAge ? `${userAge} yrs` : "N/A";
  const allergies = userAllergies ? userAllergies : "None";
  const currentMeds = userCurrentMeds ? userCurrentMeds : "None";

  return `━━━ ${disease} Report ━━━\n\n` +
    `👤 Patient: ${patientName} (Age: ${patientAge})\n` +
    `⚠️ Allergies: ${allergies} | 💊 Current Meds: ${currentMeds}\n` +
    `🔹 Severity: ${severity.toUpperCase()}\n` +
    `🔹 Type: ${type}\n\n` +
    `💊 Suggested Tablets:\n${tabletList}\n\n` +
    `🏠 Home Care:\n  ${info.homeCare}\n\n` +
    `⚠️ Warning:\n  ${info.warning}\n\n` +
    `📌 Note: Always consult a doctor before taking any medicine. This is for educational guidance only.`;
}

function detectDisease(msg) {
  const map = {
    fever: "Fever",
    cold: "Common Cold",
    "common cold": "Common Cold",
    dengue: "Dengue Fever",
    malaria: "Malaria",
    typhoid: "Typhoid Fever",
    "food poisoning": "Food Poisoning",
    headache: "Headache",
    weakness: "Weakness"
  };

  for (let key in map) {
    if (msg.includes(key)) return map[key];
  }
  return null;
}

function detectSeverity(msg) {
  if (msg.includes("mild")) return "mild";
  if (msg.includes("moderate")) return "moderate";
  if (msg.includes("high") || msg.includes("severe")) return "high";
  return null;
}

function detectType(msg) {
  if (msg.includes("viral")) return "viral";
  if (msg.includes("bacterial")) return "bacterial";
  if (msg.includes("parasitic")) return "parasitic";
  if (msg.includes("unknown")) return "unknown";
  return null;
}

function detectGreeting(msg) {
  const greetings = ["hi", "hello", "hey", "hii", "hiii", "good morning", "good afternoon", "good evening", "good night", "namaste", "howdy", "sup", "what's up", "yo"];
  for (let g of greetings) {
    if (msg === g || msg.startsWith(g + " ") || msg.startsWith(g + ",") || msg.startsWith(g + "!")) return true;
  }
  return false;
}

function detectFarewell(msg) {
  const farewells = ["bye", "goodbye", "good bye", "thanks", "thank you", "thank u", "thankyou", "see you", "take care", "ok bye", "bye bye", "tata"];
  for (let f of farewells) {
    if (msg === f || msg.startsWith(f + " ") || msg.startsWith(f + ",") || msg.startsWith(f + "!") || msg.endsWith(f)) return true;
  }
  return false;
}

function detectEmergency(msg) {
  const emergencyKeywords = [
    "chest pain", "chest tightness", "heart pain", "heart attack",
    "breathing issue", "breathing problem", "shortness of breath", "breathless",
    "cant breathe", "cannot breathe", "can't breathe", "difficulty breathing",
    "dyspnea", "wheezing", "choking", "suffocating", "not breathing"
  ];

  const lower = msg.toLowerCase();
  for (let kw of emergencyKeywords) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

function getEmergencyResponse() {
  return `🚨 ⚠️ EMERGENCY DETECTED ⚠️ 🚨

🆘 IMMEDIATE ACTION REQUIRED:

📞 STEP 1: Call Ambulance IMMEDIATELY
   • India: 102 or 108
   • Or rush to nearest hospital

🏥 GO TO NEAREST HOSPITAL ER NOW!

⚠️ DO NOT WAIT — These symptoms may indicate:
  • Heart Attack
  • Severe Asthma
  • Pulmonary Embolism
  • Anaphylaxis

💊 If you have prescribed medicine (nitroglycerin/inhaler), TAKE IT NOW and call for help.

🆘 If someone is with you, ask them to drive you to emergency.

⚠️ STAY CALM but ACT FAST — Every minute counts!
`;
}

function medicalReply(input) {
  const msg = input.toLowerCase().trim();

  // EMERGENCY DETECTION - Highest priority
  if (detectEmergency(msg)) {
    return getEmergencyResponse();
  }

  // Ask for name first
  if (!userName) {
    if (detectGreeting(msg)) {
      const history = chatMemory.getHistory();
      const welcome = "Hello! I am your medical support assistant. Could you please tell me your name?";
      return history ? welcome + "\n\n" + history : welcome;
    }

    const disease = detectDisease(msg);
    if (disease && !pendingDisease) {
      pendingDisease = disease;
      chatMemory.rememberDisease(disease);
      return `Before we proceed with ${disease}, could you please tell me your name for the medical report?`;
    }

    let name = input.trim();
    if (name.toLowerCase().startsWith("my name is ")) name = name.substring(11).trim();
    else if (name.toLowerCase().startsWith("i am ")) name = name.substring(5).trim();
    else if (name.toLowerCase().startsWith("i'm ")) name = name.substring(4).trim();
    
    userName = name.charAt(0).toUpperCase() + name.slice(1);

    return `Nice to meet you, ${userName}! Could you also tell me your age?`;
  }

  // Ask for age
  if (!userAge) {
    const disease = detectDisease(msg);
    if (disease && !pendingDisease) {
      pendingDisease = disease;
      chatMemory.rememberDisease(disease);
      return `Got it. But before we proceed with ${disease}, could you please tell me your age?`;
    }

    let ageMatch = input.match(/\d+/);
    if (ageMatch) {
      userAge = ageMatch[0];
    } else {
      return "Please enter a valid age as a number (e.g., 25).";
    }

    return `Got it. For your safety, do you have any drug allergies? (Type 'None' if you don't)`;
  }

  // Ask for allergies
  if (!userAllergies) {
    const disease = detectDisease(msg);
    if (disease && !pendingDisease) {
      pendingDisease = disease;
      chatMemory.rememberDisease(disease);
      return `Got it. But before we proceed, do you have any drug allergies?`;
    }

    userAllergies = input.charAt(0).toUpperCase() + input.slice(1);
    return `Noted. Are you currently taking any other medications? (Type 'None' if you aren't)`;
  }

  // Ask for current meds
  if (!userCurrentMeds) {
    userCurrentMeds = input.charAt(0).toUpperCase() + input.slice(1);

    if (pendingDisease) {
      const d = pendingDisease;
      showSeverityRow();
      return `Thank you! Safety profile saved. Let's continue with ${d}.\nStep 2: Choose severity below (Mild / moderate / high)`;
    }

    return `Thank you! Your safety profile is complete.\n\nI can help you with basic medicine guidance. What are your symptoms today? You can type a disease (like Fever, Cold) or select from the buttons above.`;
  }

  // Smart Confirmation
  if (waitingForSmartConfirm) {
    if (msg === "yes" || msg === "y" || msg.includes("yes")) {
      let d = waitingForSmartConfirm;
      waitingForSmartConfirm = null;
      pendingDisease = d;
      pendingSeverity = null;
      showSeverityRow();
      return `Selected: ${d}\nStep 2: Choose severity below (mild / moderate / high)`;
    } else {
      waitingForSmartConfirm = null;
    }
  }

  // Greeting - respond warmly
  if (detectGreeting(msg)) {
    const history = chatMemory.getHistory();
    const greeting = `Hello again, ${userName}! I can help you with basic medicine guidance.\n\nHow to use:\n  1. Select a disease (Fever, Cold, Dengue...)\n  2. Choose severity (Mild / Moderate / High)\n  3. Choose type (Viral / Bacterial / Parasitic)\n\nI'll suggest basic tablets, home care tips, and warning signs.\n\nWhat are your symptoms today?`;
    return history ? greeting + "\n\n" + history : greeting;
  }

  // Farewell - respond nicely
  if (detectFarewell(msg)) {
    hideAllSelections();
    pendingDisease = null;
    pendingSeverity = null;
    return `Thank you for using MediAssist Pro, ${userName}!\n\nStay healthy and take care.\n\nRemember: Always consult a real doctor for proper diagnosis.\n\nGoodbye! Feel free to come back anytime.`;
  }

  // SMART SYMPTOM CHECK
  const smartResult = smartSymptomChecker(msg);
  if (smartResult && !pendingDisease && !pendingSeverity) {
    waitingForSmartConfirm = smartResult.topDisease;
    return smartResult.reply;
  }

  const disease = detectDisease(msg);
  const severity = detectSeverity(msg);
  const type = detectType(msg);

  // Step 1: User picks a disease
  if (disease) {
    clearChat();
    pendingDisease = disease;
    pendingSeverity = null;
    chatMemory.rememberDisease(disease);
    showSeverityRow();
    return `Selected: ${disease}\nStep 2: Choose severity below (mild / moderate / high)`;
  }

  // Step 2: User picks severity
  if (pendingDisease && !pendingSeverity) {
    if (!severity) return "Please choose severity (mild / moderate / high)";
    pendingSeverity = severity;
    showTypeRow();
    return `Severity: ${severity}\nStep 3: Choose type below (viral / bacterial / parasitic / unknown)`;
  }

  // Step 3: User picks type - show result
  if (pendingDisease && pendingSeverity) {
    if (!type) return "Please choose type (viral / bacterial / parasitic / unknown)";
    const result = medicinePlan(pendingDisease, pendingSeverity, type);
    pendingDisease = null;
    pendingSeverity = null;
    hideAllSelections();
    return result;
  }

  return "Type disease name first (Fever, Cold, Dengue...)";
}

/* ---------------- EVENTS ---------------- */







/* ---------------- ROBOT TOGGLE ---------------- */



/* ---------------- FIX: HIDDEN CLASS ---------------- */

document = { createElement: () => ({ classList: {} }) };

console.log('--- TEST 1: Hii ---');
console.log(medicalReply('hii'));

console.log('--- TEST 2: Shiv ---');
console.log(medicalReply('Shiv'));

console.log('--- TEST 3: 25 ---');
console.log(medicalReply('25'));

console.log('--- TEST 4: None ---');
console.log(medicalReply('None'));

console.log('--- TEST 5: None ---');
console.log(medicalReply('None'));

console.log('--- TEST 6: fever ---');
console.log(medicalReply('fever'));
