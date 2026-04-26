const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const quickButtons = document.querySelectorAll(".quick-btn");
const selectionButtons = document.querySelectorAll(".select-btn");
const selectionActions = document.getElementById("selectionActions");
const severityRow = document.getElementById("severityRow");
const typeRow = document.getElementById("typeRow");
const robotLauncher = document.getElementById("robotLauncher");
const chatShell = document.getElementById("chatShell");

let pendingDisease = null;
let pendingSeverity = null;
let activeDisease = null;

/* ---------------- DETECT FUNCTIONS ---------------- */

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

  const tabletList = info.tablets.map(t => `  • ${t}`).join("\n");

  return `━━━ ${disease} Report ━━━\n\n` +
    `🔹 Severity: ${severity.toUpperCase()}\n` +
    `🔹 Type: ${type}\n\n` +
    `💊 Suggested Tablets:\n${tabletList}\n\n` +
    `🏠 Home Care:\n  ${info.homeCare}\n\n` +
    `⚠️ Warning:\n  ${info.warning}\n\n` +
    `📌 Note: Always consult a doctor before taking any medicine. This is for educational guidance only.`;
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

function medicalReply(input) {
  const msg = input.toLowerCase().trim();

  // Greeting — respond warmly
  if (detectGreeting(msg)) {
    return `👋 Hello! Welcome to MediAssist Pro.\n\nI'm your virtual health assistant. I can help you with basic medicine guidance for common illnesses.\n\n🩺 How to use:\n  1. Select a disease (Fever, Cold, Dengue...)\n  2. Choose severity (Mild / Moderate / High)\n  3. Choose type (Viral / Bacterial / Parasitic)\n\nI'll suggest basic tablets, home care tips, and warning signs.\n\n💬 Go ahead — click a disease button above or type one!`;
  }

  // Farewell — respond nicely
  if (detectFarewell(msg)) {
    hideAllSelections();
    pendingDisease = null;
    pendingSeverity = null;
    return `😊 Thank you for using MediAssist Pro!\n\n🙏 Stay healthy and take care.\n\n📌 Remember: Always consult a real doctor for proper diagnosis and treatment.\n\n👋 Goodbye! Feel free to come back anytime.`;
  }

  const disease = detectDisease(msg);
  const severity = detectSeverity(msg);
  const type = detectType(msg);

  // Step 1: User picks a disease — clear old chat first
  if (disease) {
    clearChat();
    pendingDisease = disease;
    pendingSeverity = null;
    showSeverityRow();
    return `Selected: ${disease}\nStep 2: Choose severity below (Mild / Moderate / High)`;
  }

  // Step 2: User picks severity
  if (pendingDisease && !pendingSeverity) {
    if (!severity) return "Please choose severity (Mild / Moderate / High)";
    pendingSeverity = severity;
    showTypeRow();
    return `Severity: ${severity}\nStep 3: Choose type below (Viral / Bacterial / Parasitic / Unknown)`;
  }

  // Step 3: User picks type → show result
  if (pendingDisease && pendingSeverity) {
    if (!type) return "Please choose type (Viral / Bacterial / Parasitic / Unknown)";
    const result = medicinePlan(pendingDisease, pendingSeverity, type);
    pendingDisease = null;
    pendingSeverity = null;
    hideAllSelections();
    return result;
  }

  return "Type disease name first (Fever, Cold, Dengue...)";
}

/* ---------------- EVENTS ---------------- */

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = userInput.value.trim();
  if (!value) return;

  addMessage("user", "You", value);

  setTimeout(() => {
    addMessage("assistant", "MediBot", medicalReply(value));
  }, 400);

  userInput.value = "";
});

quickButtons.forEach(btn => {
  btn.onclick = () => {
    const text = btn.dataset.prompt;
    addMessage("user", "You", text);
    setTimeout(() => {
      addMessage("assistant", "MediBot", medicalReply(text));
    }, 400);
  };
});

selectionButtons.forEach(btn => {
  btn.onclick = () => {
    const text = btn.dataset.prompt;
    addMessage("user", "You", text);
    setTimeout(() => {
      addMessage("assistant", "MediBot", medicalReply(text));
    }, 400);
  };
});

/* ---------------- ROBOT TOGGLE ---------------- */

robotLauncher?.addEventListener("click", () => {
  chatShell.classList.toggle("chat-closed");
});

/* ---------------- FIX: HIDDEN CLASS ---------------- */
const style = document.createElement("style");
style.innerHTML = `.hidden{display:none}`;
document.head.appendChild(style);