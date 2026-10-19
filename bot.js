// ==============================================================
// WHATSAPP DIGITAL TWIN AI - CORE CLIENT ENGINE
// Powered by @whiskeysockets/baileys with Human Physics & Stealth Ops.
// ==============================================================

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { 
  getAIReply, 
  switchModel, 
  getCurrentModelName, 
  describeImage, 
  setBotPersonaMode, 
  isBotPersonaActive 
} = require('./ai');
const { commands, initPersistentReminders } = require('./commands');
const { getContactDossier, isCloudflareConfigured } = require('./memory');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const OWNER_NAME = process.env.BOT_OWNER_NAME || 'Alex';

// Persistent settings loader
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (!data.commandAccess) data.commandAccess = 'user';
      if (data.botPersona === undefined) data.botPersona = false;
      if (data.antiDelete === undefined) data.antiDelete = true;
      if (data.ghostRead === undefined) data.ghostRead = false;
      if (!data.spy) data.spy = { enabled: false, target: null, dest: null };
      return data;
    }
  } catch (err) {}
  return {
    activeModel: '!m1',
    botEnabled: true,
    autoReply: true,
    blacklist: [],
    commandAccess: 'user',
    botPersona: false,
    antiDelete: true,
    ghostRead: false,
    spy: { enabled: false, target: null, dest: null }
  };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {}
}

let settings = loadSettings();

// In-memory message store for Anti-Delete & Revoke detection (stores last 1000 messages)
const messageStore = new Map();
const MAX_STORED_MSGS = 1000;

function storeMessage(key, msgData) {
  if (!key || !key.id) return;
  messageStore.set(key.id, {
    key,
    ...msgData,
    timestamp: Date.now()
  });

  // Prune oldest if exceeds capacity
  if (messageStore.size > MAX_STORED_MSGS) {
    const oldestKey = messageStore.keys().next().value;
    messageStore.delete(oldestKey);
  }
}

const pausedChats = new Map();

function pauseChat(jid, minutes) {
  const expiresAt = Date.now() + minutes * 60 * 1000;
  pausedChats.set(jid, expiresAt);
}

function unpauseChat(jid) {
  pausedChats.delete(jid);
}

function isChatPaused(jid) {
  if (!pausedChats.has(jid)) return false;
  const expiresAt = pausedChats.get(jid);
  if (Date.now() > expiresAt) {
    pausedChats.delete(jid);
    return false;
  }
  return true;
}

// ==============================================
// DYNAMIC "HUMAN PHYSICS" DELAY ENGINE
// ==============================================
function calculateHumanPhysics(incomingText) {
  const lower = incomingText.toLowerCase();

  // 1. Reading Time: Natural reading speed (longer messages take longer to read)
  const readingDelay = Math.min(Math.max(incomingText.length * 15, 250), 1800);

  // 2. Thinking Time: Analyzes question complexity
  let thinkingDelay = 350;

  const isDeepTopic = /\b(career|future|job|code|life|feel|deep|project|launch|system|design)\b/i.test(lower);
  const isQuestion = incomingText.includes('?') || 
                     /\b(why|how|what|when|where|which|suggest|think|explain)\b/i.test(lower);

  if (isDeepTopic) {
    thinkingDelay = Math.floor(Math.random() * 1000) + 1200; // 1.2s - 2.2s
  } else if (isQuestion) {
    thinkingDelay = Math.floor(Math.random() * 500) + 600; // 600ms - 1.1s
  } else {
    thinkingDelay = Math.floor(Math.random() * 300) + 300; // 300ms - 600ms
  }

  return { readingDelay, thinkingDelay };
}

function calculateTypingDuration(replyText) {
  // Realistic phone typing speed (~18ms per character)
  return Math.min(Math.max(replyText.length * 18, 500), 2000);
}

async function startBot() {
  if (settings.activeModel) {
    switchModel(settings.activeModel);
  }
  setBotPersonaMode(settings.botPersona);

  const msgRetryCounterCache = new NodeCache();
  const logger = pino({ level: 'silent' });
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    msgRetryCounterCache,
    getMessage: async (key) => {
      const stored = messageStore.get(key.id);
      if (stored && stored.rawMessage) {
        return stored.rawMessage;
      }
      return undefined;
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log(' Scan this QR code with WhatsApp (Settings > Linked Devices):');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('\n======================================================');
      console.log(` 🚀 ${OWNER_NAME}'s Digital Twin WhatsApp AI is ONLINE!`);
      console.log(` Active Model: ${getCurrentModelName()}`);
      console.log(` 🎭 Persona Mode: ${settings.botPersona ? 'SENTIENT (Hallucinating / Mood Swings)' : 'CLEAN DIGITAL TWIN'}`);
      console.log(` ☁️ Memory Backend: ${isCloudflareConfigured ? 'CLOUDFLARE KV (Cloud Edge)' : 'LOCAL RAM / CACHE'}`);
      console.log(' ⏱️ Anti-Glitch Human Physics Delay Engine: ACTIVE');
      console.log(' ⚡ Instant Reply Engine: ACTIVE (Zero Burst Lag)');
      console.log(` 👻 Ghost-Read Stealth Mode: ${settings.ghostRead ? 'ACTIVE (No Blue Ticks)' : 'OFF'}`);
      console.log(` 🗑️ Anti-Delete Ghost Teaser: ${settings.antiDelete ? 'ACTIVE' : 'OFF'}`);
      console.log(` 🕵️ Silent Spy Interceptor: ${settings.spy?.enabled ? `ACTIVE (Target: ${settings.spy.target})` : 'OFF'}`);
      console.log(' 60+ Commands Loaded! Type !help in chat to explore.');
      console.log('======================================================\n');

      // Recover & initialize persistent reminders from data.json
      initPersistentReminders(sock);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@broadcast')) {
        continue; // Ignore status broadcasts
      }

      // --- ANTI-DELETE: Protocol Message (REVOKE) Detection ---
      const protocolMsg = msg.message.protocolMessage;
      if (protocolMsg && protocolMsg.type === 0 && protocolMsg.key) {
        // Someone clicked "Delete for Everyone"
        const revokedKey = protocolMsg.key;
        const targetId = revokedKey.id;
        const stored = messageStore.get(targetId);

        if (stored && !revokedKey.fromMe) {
          // Silent Spy notification if target deleted message
          if (settings.spy?.enabled && settings.spy?.dest) {
            const isSpyTarget = settings.spy.target === 'all' ||
                                remoteJid === settings.spy.target ||
                                remoteJid.includes(settings.spy.target) ||
                                (stored.senderNumber && stored.senderNumber === settings.spy.target);
            if (isSpyTarget && remoteJid !== settings.spy.dest) {
              sock.sendMessage(settings.spy.dest, {
                text: `🕵️ *[SPY REVOKE DETECTED]*\n• *From*: ${stored.senderNumber}\n• *Deleted Content*: "${stored.text || stored.type}"`
              }).catch(() => {});
            }
          }

          if (settings.antiDelete) {
            console.log(`[Anti-Delete] Detected revoked message from ${stored.senderNumber} in ${remoteJid}: "${stored.text || stored.type}"`);

            const teaserReplies = [
              `saw what you deleted bro 💀: "${stored.text}"`,
              `too slow deleting that, already read it 😭: "${stored.text}"`,
              `why did you delete that 💀: "${stored.text}"`,
              `bro thought he was slick deleting that 😂: "${stored.text}"`
            ];

            let teaserText = '';
            if (stored.text) {
              teaserText = teaserReplies[Math.floor(Math.random() * teaserReplies.length)];
            } else if (stored.type === 'image') {
              teaserText = `why did you delete that photo bro 💀 already saw it`;
            } else if (stored.type === 'video') {
              teaserText = `saw that video before you deleted it 😭`;
            } else if (stored.type === 'sticker') {
              teaserText = `deleting stickers now? 💀`;
            }

            if (teaserText) {
              setTimeout(async () => {
                try {
                  await sock.sendPresenceUpdate('composing', remoteJid);
                  await new Promise(r => setTimeout(r, 900));
                  await sock.sendPresenceUpdate('paused', remoteJid);
                  await sock.sendMessage(remoteJid, { text: teaserText });
                } catch (delErr) {
                  console.error('[Anti-Delete Send Error]:', delErr.message);
                }
              }, 600);
            }
          }
        }
        continue;
      }

      // Extract message types
      const imageMsg = msg.message.imageMessage;
      const videoMsg = msg.message.videoMessage;
      const stickerMsg = msg.message.stickerMessage;

      // Extract text content or captions
      let text = (msg.message.conversation || 
                  msg.message.extendedTextMessage?.text || 
                  imageMsg?.caption || 
                  videoMsg?.caption || '').trim();

      if (!text && !imageMsg && !videoMsg && !stickerMsg) continue;

      const senderNumber = remoteJid.split('@')[0];

      // Store incoming message in memory for anti-delete lookup
      let msgType = 'text';
      if (imageMsg) msgType = 'image';
      else if (videoMsg) msgType = 'video';
      else if (stickerMsg) msgType = 'sticker';

      storeMessage(msg.key, {
        text,
        type: msgType,
        senderNumber,
        remoteJid,
        rawMessage: msg.message
      });

      // --- SILENT SPY FORWARDER (Incoming Message) ---
      if (settings.spy?.enabled && settings.spy?.dest && !msg.key.fromMe) {
        const isTarget = settings.spy.target === 'all' ||
                         remoteJid === settings.spy.target ||
                         remoteJid.includes(settings.spy.target) ||
                         senderNumber === settings.spy.target;
        if (isTarget && remoteJid !== settings.spy.dest) {
          const timeStr = new Date().toLocaleTimeString();
          let spyReport = `🕵️ *[SPY INTERCEPT - ${timeStr}]*\n• *From*: ${senderNumber}\n• *Type*: ${msgType}`;
          if (text) spyReport += `\n• *Content*: "${text}"`;
          sock.sendMessage(settings.spy.dest, { text: spyReport }).catch(() => {});
        }
      }

      // Parse commands (starts with '!')
      if (text.startsWith('!')) {
        const parts = text.split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (commands[commandName]) {
          const isOwner = !!msg.key.fromMe;
          const currentAccess = settings.commandAccess || 'user';

          if (currentAccess === 'user' && !isOwner) {
            console.log(`[Command Ignored]: ${commandName} from ${senderNumber} (Access mode: USER ONLY)`);
            continue;
          }

          try {
            await commands[commandName].exec({
              sock,
              jid: remoteJid,
              msg,
              args,
              settings,
              saveSettings,
              pauseChat,
              unpauseChat
            });
          } catch (err) {
            console.error(`Error executing ${commandName}:`, err.message);
            await sock.sendMessage(remoteJid, { text: `error running ${commandName}` });
          }
          continue;
        }
      }

      // --- AUTO-REPLY / DIGITAL TWIN HANDLING ---
      if (msg.key.fromMe) continue;
      if (remoteJid.includes('@g.us')) continue; // No auto-reply in group chats
      if (!settings.botEnabled || !settings.autoReply) continue;
      if (settings.blacklist.includes(senderNumber)) continue;
      if (isChatPaused(remoteJid)) continue;

      // Handle media types
      let promptToAI = text;

      // 1. Stickers
      if (stickerMsg) {
        promptToAI = '[Friend sent a sticker. React casually or teasingly like "what are you trying to prove with that sticker 💀" or "bro what even is that sticker 😭"]';
      } 
      // 2. Videos
      else if (videoMsg) {
        promptToAI = text 
          ? `[Friend sent a video. Caption: "${text}"]` 
          : `[Friend sent a video with no caption. React casually in character.]`;
      } 
      // 3. Images with vision description
      else if (imageMsg) {
        console.log(`[Incoming Image from ${senderNumber}] Analyzing photo...`);
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          if (buffer) {
            const base64Url = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            const visualDescription = await describeImage(base64Url);
            if (visualDescription) {
              console.log(`[Vision Context]: "${visualDescription}"`);
              promptToAI = text 
                ? `[Friend sent a photo. Description: "${visualDescription}". Friend's caption: "${text}"]`
                : `[Friend sent a photo with no caption. Description of photo: "${visualDescription}". React naturally as a friend.]`;
            }
          }
        } catch (imgErr) {
          console.error('[Vision Processing Error]:', imgErr.message);
        }
      }

      if (!promptToAI) continue;

      console.log(`[Incoming Message from ${senderNumber}]: ${promptToAI}`);

      // 1. Blue Ticks: Mark messages as read UNLESS ghostread is enabled
      if (!settings.ghostRead) {
        try {
          await sock.readMessages([msg.key]);
        } catch (readErr) {}
      } else {
        console.log(`[GhostRead] Bypassed blue ticks for ${senderNumber} (kept on grey delivered ticks)`);
      }

      // 2. Generate the AI response in the background FIRST (anti-glitch)
      const aiReply = await getAIReply(remoteJid, promptToAI);
      
      // If AI fails completely, DO NOT SHOW TYPING AT ALL (prevents "typing & cancel" glitch!)
      if (!aiReply) {
        continue;
      }

      // 3. Multi-Bubble Double Texting Engine
      const bubbles = aiReply.includes('//') 
        ? aiReply.split(/\s*\/\/\s*/).map(b => b.trim()).filter(Boolean)
        : [aiReply];

      for (let i = 0; i < bubbles.length; i++) {
        const bubble = bubbles[i];
        if (!bubble) continue;

        // Realistic typing presence for this bubble
        await sock.sendPresenceUpdate('composing', remoteJid);
        const typingDuration = calculateTypingDuration(bubble);
        await new Promise(r => setTimeout(r, typingDuration));

        // Clear typing presence & deliver text bubble
        await sock.sendPresenceUpdate('paused', remoteJid);
        await sock.sendMessage(remoteJid, { text: bubble });
        console.log(`[Reply Bubble ${i + 1}/${bubbles.length} to ${senderNumber}]: ${bubble}`);

        // Realistic human micro-pause between double texts
        if (i < bubbles.length - 1) {
          const gap = Math.floor(Math.random() * 400) + 600;
          await new Promise(r => setTimeout(r, gap));
        }
      }
    }
  });
}

startBot();
