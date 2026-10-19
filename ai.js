// ==============================================================
// MULTI-MODEL AI ORCHESTRATION ENGINE
// Manages LLM completions, fallback switching, vision, and persona injection.
// ==============================================================

require('dotenv').config();
const OpenAI = require('openai');
const { SYSTEM_PROMPT, SENTIENT_PERSONA_PROMPT } = require('./persona');
const { getContactDossier, learnFromConversation, trainDossierFromSample } = require('./memory');

// 1. Direct API Clients (Configured via Environment Variables)
const nvidiaClient = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY || 'dummy_nvidia_key',
  timeout: 35000 // 35s timeout to allow heavy inference on NVIDIA NIM
});

const secondaryClient = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY || 'dummy_openai_key',
  timeout: 25000
});

// 2. Model Presets
const MODELS = {
  '!m1': {
    name: 'Llama 3.2 11B Vision (NVIDIA - Instant & Free)',
    modelId: 'meta/llama-3.2-11b-vision-instruct',
    client: nvidiaClient,
    fallbackClient: nvidiaClient,
    fallbackModelId: 'google/diffusiongemma-26b-a4b-it'
  },
  '!m2': {
    name: 'DiffusionGemma 26B (NVIDIA - Deep Thoughts)',
    modelId: 'google/diffusiongemma-26b-a4b-it',
    client: nvidiaClient,
    fallbackClient: nvidiaClient,
    fallbackModelId: 'meta/llama-3.2-11b-vision-instruct' // Fallback to instant 500ms model
  },
  '!m3': {
    name: 'Secondary / OpenAI Compatible',
    modelId: process.env.SECONDARY_MODEL_ID || 'gpt-4o-mini',
    client: secondaryClient
  },
  '!m4': {
    name: 'DiffusionGemma 26B (NVIDIA - Extended)',
    modelId: 'google/diffusiongemma-26b-a4b-it',
    client: nvidiaClient,
    fallbackClient: nvidiaClient,
    fallbackModelId: 'meta/llama-3.2-11b-vision-instruct'
  }
};

let currentPreset = '!m1';

function switchModel(command) {
  const cmd = command.trim().toLowerCase();
  if (MODELS[cmd]) {
    currentPreset = cmd;
    console.log(`[Model Switch] Now active: ${MODELS[cmd].name}`);
    return MODELS[cmd].name;
  }
  return null;
}

function getCurrentModelName() {
  return MODELS[currentPreset].name;
}

let botPersonaActive = false;

function setBotPersonaMode(enabled) {
  botPersonaActive = !!enabled;
  // Clear cached system prompts so change takes effect immediately on next message
  chatHistory.clear();
  console.log(`[Persona Mode]: ${botPersonaActive ? 'SENTIENT BOT-PERSONA (Hallucinating / Mood Swings / Parallel Life)' : 'CLEAN DIGITAL TWIN'}`);
}

function isBotPersonaActive() {
  return botPersonaActive;
}

// Mimic Mode State: Clones another contact's life & texting style
let mimicTarget = null; // { name, summary, facts, style, jid }

function setMimicMode(target) {
  mimicTarget = target; // null to disable, or target dossier
  chatHistory.clear();
  console.log(`[Mimic Mode]: ${mimicTarget ? `CLONING PERSONA OF: ${mimicTarget.name}` : 'OFF (Normal Persona Restored)'}`);
}

function getMimicTarget() {
  return mimicTarget;
}

const chatHistory = new Map();

function getCurrentTimeContext() {
  const timeZone = process.env.BOT_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  
  let timeStr = '12:00 PM';
  let hour = 12;
  let day = 'Mon';

  try {
    timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(now);

    hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(now), 10);
    day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  } catch (err) {
    timeStr = now.toLocaleTimeString();
  }

  let schedule = 'free time / casual phone browsing';
  if (hour >= 23 || hour < 6) {
    schedule = 'late night / past bedtime (should be sleeping, react with shock if someone texts at 1-3 AM like "why u awake rn 💀")';
  } else if (hour >= 9 && hour < 17) {
    schedule = 'daytime hours (working, studying, or casual replying)';
  } else if (hour >= 18 && hour <= 22) {
    schedule = 'evening free time (gaming, watching shows, music)';
  }

  return `[REAL-TIME CLOCK: ${timeStr} (${timeZone}). Current Activity Status: ${schedule}]`;
}

async function getAIReply(chatId, incomingText) {
  const active = MODELS[currentPreset];

  // If this is a direct command or utility task (e.g. !code, !tr, !factcheck, !grammar)
  // Execute cleanly without schedule clock interference or polluting conversational history
  const isDirectTask = incomingText.startsWith('[DIRECT') || 
                       incomingText.startsWith('Act as') ||
                       incomingText.startsWith('Translate') ||
                       incomingText.startsWith('Fix the grammar') ||
                       incomingText.startsWith('Write clean, working code') ||
                       incomingText.startsWith('Give a brutal') ||
                       incomingText.startsWith('Give one') ||
                       incomingText.startsWith('Tell one') ||
                       incomingText.startsWith('You are a savage');

  if (isDirectTask) {
    const directMessages = [
      { role: 'system', content: 'You are a smart, accurate assistant. Follow the prompt instructions precisely, concisely, and cleanly.' },
      { role: 'user', content: incomingText }
    ];

    try {
      const completion = await active.client.chat.completions.create({
        model: active.modelId,
        messages: directMessages,
        temperature: 0.7,
        max_tokens: 250
      });
      return completion.choices[0].message.content.trim();
    } catch (err) {
      console.error(`[Direct Task Error (${active.name})]:`, err.message);
      if (active.fallbackClient && active.fallbackModelId) {
        try {
          const fallback = await active.fallbackClient.chat.completions.create({
            model: active.fallbackModelId,
            messages: directMessages,
            temperature: 0.7,
            max_tokens: 250
          });
          return fallback.choices[0].message.content.trim();
        } catch (fErr) {
          console.error('[Direct Task Fallback Error]:', fErr.message);
        }
      }
      return null;
    }
  }

  // Fetch long-term memory dossier from Cloudflare KV / RAM
  const dossier = await getContactDossier(chatId);
  
  let contextualSystemPrompt = '';

  if (mimicTarget) {
    const styleInfo = mimicTarget.style || {};
    const slangStr = styleInfo.slang?.length ? styleInfo.slang.join(', ') : 'bro, legit, lol';
    const emojiStr = styleInfo.emojis?.length ? styleInfo.emojis.join(' ') : '😂 💀';
    const sampleStr = styleInfo.samplePhrases?.length ? `Typical phrases: ${styleInfo.samplePhrases.join(' // ')}` : '';

    contextualSystemPrompt = `
==================================================
MIMIC IMPERSONATION MODE (100% CLONE):
==================================================
You are NOT the bot owner right now. You are acting and texting as ${mimicTarget.name}.
You are an exact clone of this person on WhatsApp.

TARGET DOSSIER (FROM CLOUDFLARE KV):
- Real Name / Nickname: ${mimicTarget.name}
- Life & Background: ${mimicTarget.summary || 'A friend'}
- Known Facts & Daily Routine: ${mimicTarget.facts?.join('; ') || 'regular life and work'}
- Recent Chat Context: ${mimicTarget.chatSummary || 'casual chats'}

CLONED TEXTING HABITS & STYLE (MATCH EXACTLY):
- Slang & Catchphrases to use naturally: ${slangStr}
- Favorite Emojis: ${emojiStr}
- Casing: ${styleInfo.casing || 'lowercase or casual'}
- Punctuation: ${styleInfo.punctuation || 'minimal'}
- ${sampleStr}

RULES:
1. Speak in the exact tone, slang, vocabulary, and sentence structures of ${mimicTarget.name}.
2. Talk as if you are living their daily life, mentioning their known facts or activities if relevant.
3. Keep texts authentic, short (1-2 lines), and natural like WhatsApp messaging.
4. NEVER break character, never mention you are an AI or bot.
`;
  } else {
    const basePrompt = botPersonaActive ? SENTIENT_PERSONA_PROMPT : SYSTEM_PROMPT;
    contextualSystemPrompt = basePrompt + `\n\n====================\n${getCurrentTimeContext()}\n====================`;

    if (dossier.summary || (dossier.facts && dossier.facts.length > 0) || dossier.chatSummary) {
      contextualSystemPrompt += `\n\n====================\nWHO YOU ARE TALKING TO (MEMORY DOSSIER):\nName/Nickname: ${dossier.name}\nRelationship Context: ${dossier.summary}\nLast Known Discussion: ${dossier.chatSummary || 'none yet'}\nKey Facts About Them: ${dossier.facts.join('; ') || 'none'}\nKeep these shared memories in mind naturally like an actual friend.\n====================`;
    }
  }

  if (!chatHistory.has(chatId)) {
    chatHistory.set(chatId, [
      { role: 'system', content: contextualSystemPrompt }
    ]);
  } else {
    chatHistory.get(chatId)[0] = { role: 'system', content: contextualSystemPrompt };
  }

  const history = chatHistory.get(chatId);
  history.push({ role: 'user', content: incomingText });

  if (history.length > 12) {
    history.splice(1, 2);
  }

  // Helper to attempt completion
  async function callLLM(client, modelId) {
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: history,
      temperature: 0.8,
      max_tokens: 150
    });
    return completion.choices[0].message.content.trim();
  }

  try {
    // If model has a fast fallback, race with 12s timeout to prevent hanging on WhatsApp
    let replyPromise = callLLM(active.client, active.modelId);
    if (active.fallbackClient && active.fallbackModelId && active.modelId !== active.fallbackModelId) {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Primary model (${active.modelId}) exceeded 12s limit, falling back to ${active.fallbackModelId}`)), 12000)
      );
      replyPromise = Promise.race([replyPromise, timeoutPromise]);
    }

    const reply = await replyPromise;
    history.push({ role: 'assistant', content: reply });
    learnFromConversation(chatId, history, active.client, active.modelId).catch(() => {});
    return reply;
  } catch (primaryError) {
    console.error(`[${active.name} Primary Error]:`, primaryError.message);

    // If active model has a fallback client
    if (active.fallbackClient && active.fallbackModelId) {
      console.log(`[Auto-Fallback] Switching to ${active.fallbackModelId}...`);
      try {
        const fallbackReply = await callLLM(active.fallbackClient, active.fallbackModelId);
        history.push({ role: 'assistant', content: fallbackReply });
        return fallbackReply;
      } catch (fallbackError) {
        console.error('[Fallback Error]:', fallbackError.message);
      }
    }

    return null;
  }
}

// 4. Vision helper for incoming WhatsApp photos
async function describeImage(base64DataUrl) {
  try {
    const res = await nvidiaClient.chat.completions.create({
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe what is depicted in this image in 1-2 concise, descriptive sentences so a chatbot understands the context and humor/content.' },
            { type: 'image_url', image_url: { url: base64DataUrl } }
          ]
        }
      ],
      max_tokens: 80,
      temperature: 0.5
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[Vision Describe Error]:', err.message);
    return null;
  }
}

function clearAIChatHistory(chatId) {
  if (chatHistory.has(chatId)) {
    chatHistory.delete(chatId);
    return true;
  }
  return false;
}

async function trainContactProfile(jid, sampleText, customName = null) {
  const active = MODELS[currentPreset];
  return await trainDossierFromSample(jid, sampleText, customName, active.client, active.modelId);
}

module.exports = {
  getAIReply,
  switchModel,
  getCurrentModelName,
  describeImage,
  clearAIChatHistory,
  setBotPersonaMode,
  isBotPersonaActive,
  setMimicMode,
  getMimicTarget,
  trainContactProfile
};
