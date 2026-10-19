// ==============================================================
// CLOUDFLARE KV EDGE & RAM HYBRID MEMORY ENGINE
// Stores long-term contact dossiers, relationship context, and texting styles.
// ==============================================================

require('dotenv').config();

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CF_NAMESPACE_ID = process.env.CLOUDFLARE_NAMESPACE_ID || '';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

const isCloudflareConfigured = Boolean(CF_ACCOUNT_ID && CF_NAMESPACE_ID && CF_API_TOKEN);

// 1. RAM Cache (Instant 0ms lookup for active chats)
const ramDossiers = new Map();
const messageCounters = new Map();

// Helper to sanitize JID for KV key
function getCleanKey(jid) {
  return `contact_${jid.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

// 2. Fetch Contact Dossier (RAM first -> Cloudflare KV fallback)
async function getContactDossier(jid) {
  if (ramDossiers.has(jid)) {
    return ramDossiers.get(jid);
  }

  if (isCloudflareConfigured) {
    const key = getCleanKey(jid);
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/values/${key}`;

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
      });

      if (res.ok) {
        const dossier = await res.json();
        if (!dossier.facts) dossier.facts = [];
        if (!dossier.chatSummary) dossier.chatSummary = '';
        if (!dossier.style) {
          dossier.style = {
            slang: [],
            emojis: [],
            casing: 'mixed',
            punctuation: 'minimal',
            samplePhrases: []
          };
        }
        ramDossiers.set(jid, dossier);
        console.log(`[Cloudflare KV] Loaded memory for ${dossier.name || jid}`);
        return dossier;
      }
    } catch (err) {
      console.error('[Cloudflare KV Read Error]:', err.message);
    }
  }

  // Default dossier for new contact
  const defaultDossier = {
    name: 'Friend',
    summary: 'A contact texting on WhatsApp',
    chatSummary: '',
    facts: [],
    style: {
      slang: [],
      emojis: [],
      casing: 'mixed',
      punctuation: 'minimal',
      samplePhrases: []
    },
    interactionCount: 0,
    lastUpdated: new Date().toISOString()
  };
  ramDossiers.set(jid, defaultDossier);
  return defaultDossier;
}

// 3. Save / Update Contact Dossier in Cloudflare KV & RAM
async function saveContactDossier(jid, dossier) {
  dossier.lastUpdated = new Date().toISOString();
  ramDossiers.set(jid, dossier);

  if (isCloudflareConfigured) {
    const key = getCleanKey(jid);
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/values/${key}`;

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dossier)
      });
      if (res.ok) {
        console.log(`[Cloudflare KV] Synced dossier for ${dossier.name || jid} to Cloud!`);
      } else {
        console.error(`[Cloudflare KV PUT Error]: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error('[Cloudflare KV Write Error]:', err.message);
    }
  }
}

// 4. Manual Profile Editor (Used by !profile command)
async function setManualProfile(jid, { name, summary, facts }) {
  const current = await getContactDossier(jid);
  if (name) current.name = name;
  if (summary) current.summary = summary;
  if (facts && Array.isArray(facts)) current.facts = facts;
  await saveContactDossier(jid, current);
  return current;
}

// 5. Clear Memory for a Contact
async function clearContactMemory(jid) {
  const blank = {
    name: 'Friend',
    summary: 'A contact texting on WhatsApp',
    chatSummary: '',
    facts: [],
    style: {
      slang: [],
      emojis: [],
      casing: 'mixed',
      punctuation: 'minimal',
      samplePhrases: []
    },
    interactionCount: 0,
    lastUpdated: new Date().toISOString()
  };
  await saveContactDossier(jid, blank);
  return blank;
}

// 6. Background Persona Profiler & Chat Summarizer
async function learnFromConversation(jid, history, aiClient, modelId) {
  const count = (messageCounters.get(jid) || 0) + 1;
  messageCounters.set(jid, count);

  // Profile every 4 messages to keep memory fresh
  if (count % 4 !== 0) return;

  try {
    const currentDossier = await getContactDossier(jid);
    const recentConvo = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `You are an automatic memory and style profiler for WhatsApp. Analyze these recent texts exchanged with this contact:
${recentConvo}

Current dossier:
Name: ${currentDossier.name}
Relationship Context: ${currentDossier.summary}
Previous Discussion Summary: ${currentDossier.chatSummary || 'none'}
Known Facts: ${JSON.stringify(currentDossier.facts)}
Known Texting Style: ${JSON.stringify(currentDossier.style || {})}

Extract and update:
1. "name": Their real name/nickname if stated or known (keep "${currentDossier.name}" if unsure).
2. "summary": 1-sentence relationship summary (e.g. "close friend discussing gaming and work").
3. "chatSummary": 1-sentence summary of what was discussed recently.
4. "facts": Array of 2-5 key facts learned about this person's life, hobbies, work, or routine.
5. "style": Deep clone of how THIS contact texts:
   - "slang": Array of 2-5 slang words or catchphrases they use.
   - "emojis": Array of emojis they use frequently.
   - "casing": "all lowercase", "Capitalized", or "mixed"
   - "punctuation": "minimal", "excessive", "lots of questions", or "standard"
   - "samplePhrases": Array of 2-3 short typical phrases or sentences this person would say.

Respond ONLY with valid JSON in this exact structure:
{"name":"...","summary":"...","chatSummary":"...","facts":["..."],"style":{"slang":["..."],"emojis":["..."],"casing":"...","punctuation":"...","samplePhrases":["..."]}}`;

    const completion = await aiClient.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 350
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const updated = JSON.parse(jsonMatch[0]);
      if (updated.name) currentDossier.name = updated.name;
      if (updated.summary) currentDossier.summary = updated.summary;
      if (updated.chatSummary) currentDossier.chatSummary = updated.chatSummary;
      if (Array.isArray(updated.facts) && updated.facts.length > 0) {
        currentDossier.facts = Array.from(new Set([...currentDossier.facts, ...updated.facts])).slice(-8);
      }
      if (updated.style) {
        currentDossier.style = {
          slang: Array.from(new Set([...(currentDossier.style?.slang || []), ...(updated.style.slang || [])])).slice(-8),
          emojis: Array.from(new Set([...(currentDossier.style?.emojis || []), ...(updated.style.emojis || [])])).slice(-6),
          casing: updated.style.casing || currentDossier.style?.casing || 'mixed',
          punctuation: updated.style.punctuation || currentDossier.style?.punctuation || 'minimal',
          samplePhrases: Array.from(new Set([...(currentDossier.style?.samplePhrases || []), ...(updated.style.samplePhrases || [])])).slice(-5)
        };
      }
      currentDossier.interactionCount = (currentDossier.interactionCount || 0) + 4;
      await saveContactDossier(jid, currentDossier);
    }
  } catch (err) {
    console.error('[Memory Profiler Error]:', err.message);
  }
}

// 7. Find Dossier by Name or Number (Used by !mimic)
async function findDossier(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();

  // Search RAM first
  for (const [jid, dossier] of ramDossiers.entries()) {
    if (jid.toLowerCase().includes(q) || (dossier.name && dossier.name.toLowerCase().includes(q))) {
      return { jid, dossier };
    }
  }

  // If query looks like a JID or phone number, fetch directly
  const cleanPhone = q.replace(/[^0-9]/g, '');
  if (cleanPhone.length >= 8) {
    const candidateJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    const dossier = await getContactDossier(candidateJid);
    return { jid: candidateJid, dossier };
  }

  // Also query Cloudflare KV list keys if name wasn't in RAM cache yet
  if (isCloudflareConfigured) {
    try {
      const listUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/keys?prefix=contact_`;
      const res = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.length) {
          for (const item of data.result) {
            const rawKey = item.name.replace(/^contact_/, '');
            const d = await getContactDossier(rawKey);
            if (d && ((d.name && d.name.toLowerCase().includes(q)) || rawKey.toLowerCase().includes(q))) {
              return { jid: rawKey, dossier: d };
            }
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

// 8. Instant Manual Bootstrap / Training (Used by !mimic train or !mimic learn)
async function trainDossierFromSample(jid, sampleText, customName = null, aiClient, modelId) {
  const currentDossier = await getContactDossier(jid);
  if (customName) currentDossier.name = customName;

  const prompt = `You are an expert linguistic, behavioral, and texting-style profiler.
Analyze this sample of WhatsApp messages sent by this person:
"""
${sampleText}
"""

Current target name: ${currentDossier.name}

Extract and deeply clone:
1. "name": Their real name/nickname if stated in the sample (or keep "${currentDossier.name}").
2. "summary": 1-sentence relationship/personality summary.
3. "chatSummary": 1-sentence summary of recent themes or topics in the sample.
4. "facts": Array of 3-6 distinct facts learned about this person (hobbies, routine, background, preferences, friends).
5. "style": Deep clone of how THIS person texts:
   - "slang": Array of 3-8 slang words, abbreviations, or catchphrases they use.
   - "emojis": Array of emojis they use frequently.
   - "casing": "all lowercase", "Capitalized", or "mixed"
   - "punctuation": "minimal", "excessive", "lots of questions", or "standard"
   - "samplePhrases": Array of 2-4 short typical sentences or phrases this person would say.

Respond ONLY with valid JSON in this exact structure:
{"name":"...","summary":"...","chatSummary":"...","facts":["..."],"style":{"slang":["..."],"emojis":["..."],"casing":"...","punctuation":"...","samplePhrases":["..."]}}`;

  const completion = await aiClient.chat.completions.create({
    model: modelId,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 450
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return null;

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const updated = JSON.parse(jsonMatch[0]);
  if (updated.name) currentDossier.name = updated.name;
  if (updated.summary) currentDossier.summary = updated.summary;
  if (updated.chatSummary) currentDossier.chatSummary = updated.chatSummary;
  if (Array.isArray(updated.facts) && updated.facts.length > 0) {
    currentDossier.facts = Array.from(new Set([...currentDossier.facts, ...updated.facts])).slice(-10);
  }
  if (updated.style) {
    currentDossier.style = {
      slang: Array.from(new Set([...(currentDossier.style?.slang || []), ...(updated.style.slang || [])])).slice(-10),
      emojis: Array.from(new Set([...(currentDossier.style?.emojis || []), ...(updated.style.emojis || [])])).slice(-8),
      casing: updated.style.casing || currentDossier.style?.casing || 'mixed',
      punctuation: updated.style.punctuation || currentDossier.style?.punctuation || 'minimal',
      samplePhrases: Array.from(new Set([...(currentDossier.style?.samplePhrases || []), ...(updated.style.samplePhrases || [])])).slice(-6)
    };
  }

  currentDossier.interactionCount = (currentDossier.interactionCount || 0) + 10;
  await saveContactDossier(jid, currentDossier);
  return currentDossier;
}

function getAllKnownDossiers() {
  const list = [];
  for (const [jid, d] of ramDossiers.entries()) {
    list.push({ jid, name: d.name, summary: d.summary, factsCount: d.facts?.length || 0 });
  }
  return list;
}

module.exports = {
  getContactDossier,
  saveContactDossier,
  setManualProfile,
  clearContactMemory,
  learnFromConversation,
  findDossier,
  getAllKnownDossiers,
  trainDossierFromSample,
  isCloudflareConfigured
};
