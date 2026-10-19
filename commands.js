// ==============================================================
// COMMAND REGISTRY & UTILITY ENGINE
// 60+ modular commands across AI, Productivity, Banter, and Stealth Ops.
// ==============================================================

const fs = require('fs');
const path = require('path');
const { 
  getAIReply, 
  switchModel, 
  getCurrentModelName, 
  clearAIChatHistory, 
  setBotPersonaMode, 
  isBotPersonaActive, 
  setMimicMode, 
  getMimicTarget, 
  trainContactProfile 
} = require('./ai');
const { 
  getContactDossier, 
  setManualProfile, 
  clearContactMemory, 
  findDossier, 
  getAllKnownDossiers,
  isCloudflareConfigured 
} = require('./memory');

const DATA_FILE = path.join(__dirname, 'data.json');

// Active typing loops map for Phantom Typer
const activeTypingLoops = new Map();

// Helper to load persistent todos, notes, and reminders
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (!parsed.todos) parsed.todos = {};
      if (!parsed.notes) parsed.notes = {};
      if (!parsed.reminders) parsed.reminders = [];
      return parsed;
    }
  } catch (err) {}
  return { todos: {}, notes: {}, reminders: [] };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

const db = loadData();

// --- LIVE APIS & HELPERS ---

// 1. Live Stocks (Yahoo Finance)
async function getStock(symbol) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return `couldnt find ticker "${symbol}", try like !stock NVDA or !stock AAPL`;
    const price = meta.regularMarketPrice;
    const diff = price - meta.previousClose;
    const pct = ((diff / meta.previousClose) * 100).toFixed(2);
    const sign = diff >= 0 ? '+' : '';
    return `📈 *${symbol.toUpperCase()}*: ${meta.currency || 'USD'} ${price.toFixed(2)} (${sign}${pct}% today)`;
  } catch (e) {
    return `error fetching stock info for ${symbol}`;
  }
}

// 2. Live Weather (wttr.in)
async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C,+%t+(Feels+like+%f)+|+Humidity:+%h+|+Wind:+%w`);
    if (!res.ok) return `couldnt find weather for "${city}"`;
    const text = await res.text();
    return `🌤️ *Weather in ${city.toUpperCase()}*:\n${text.trim()}`;
  } catch (e) {
    return `error fetching weather for ${city}`;
  }
}

// 3. Wikipedia Summary
async function getWiki(query) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
    if (!res.ok) return `no wiki page found for "${query}"`;
    const data = await res.json();
    return `📖 *${data.title}*:\n${data.extract || 'no summary available'}`;
  } catch (e) {
    return `error searching wiki for ${query}`;
  }
}

// 4. Safe Math Calculator
function calculate(expr) {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().%^ Math.sqrtMath.powMath.PI]/g, '');
    const result = Function(`'use strict'; return (${sanitized})`)();
    return `🧮 *Result*: ${result}`;
  } catch (e) {
    return `invalid math expression`;
  }
}

// --- COMMAND REGISTRY ---
const commands = {
  // =====================
  // 1. AI BRAIN & MODELS
  // =====================
  '!m1': {
    desc: 'Switch to DiffusionGemma 26B (NVIDIA - Fast & Free)',
    exec: async ({ sock, jid, settings, saveSettings }) => {
      const name = switchModel('!m1');
      settings.activeModel = '!m1';
      saveSettings(settings);
      await sock.sendMessage(jid, { text: `switched model to ${name}` });
    }
  },
  '!m2': {
    desc: 'Switch to Llama 3.3 70B (NVIDIA - Deep Reasoning)',
    exec: async ({ sock, jid, settings, saveSettings }) => {
      const name = switchModel('!m2');
      settings.activeModel = '!m2';
      saveSettings(settings);
      await sock.sendMessage(jid, { text: `switched model to ${name}` });
    }
  },
  '!m3': {
    desc: 'Switch to Secondary / OpenAI Compatible Engine',
    exec: async ({ sock, jid, settings, saveSettings }) => {
      const name = switchModel('!m3');
      settings.activeModel = '!m3';
      saveSettings(settings);
      await sock.sendMessage(jid, { text: `switched model to ${name}` });
    }
  },
  '!m4': {
    desc: 'Switch to Llama 3.2 11B (NVIDIA - Ultra Fast)',
    exec: async ({ sock, jid, settings, saveSettings }) => {
      const name = switchModel('!m4');
      settings.activeModel = '!m4';
      saveSettings(settings);
      await sock.sendMessage(jid, { text: `switched model to ${name}` });
    }
  },
  '!ask': {
    desc: 'Direct AI query (bypasses texting persona)',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !ask <question>' });
      const reply = await getAIReply(jid, `[DIRECT FACTUAL INSTRUCTION]: Answer this directly, accurately, and clearly: ${args.join(' ')}`);
      await sock.sendMessage(jid, { text: reply || 'error generating answer' });
    }
  },
  '!gen': {
    desc: 'Generate AI image via FLUX (!gen <prompt>)',
    exec: async ({ sock, jid, args, msg }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !gen <image description>' });
      const promptText = args.join(' ');
      await sock.sendPresenceUpdate('composing', jid);
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      try {
        await sock.sendMessage(jid, {
          image: { url: imageUrl },
          caption: `🎨 *AI Art*: "${promptText}"`
        }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: 'error generating image, try again' });
      }
    }
  },
  '!prompt': {
    desc: 'Expand rough concept into high-detail AI prompt (!prompt <idea>)',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !prompt <rough idea>' });
      const promptReq = `Act as an expert AI prompt engineer for Midjourney and FLUX. Expand this concept into a hyper-detailed prompt with lighting, atmosphere, and camera details. Return ONLY the prompt:\n${args.join(' ')}`;
      const expanded = await getAIReply(jid, promptReq);
      await sock.sendMessage(jid, { text: `✨ *Expanded Prompt:*\n\n${expanded}` });
    }
  },
  '!code': {
    desc: 'Coding assistant with syntax formatting',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !code <coding task>' });
      const prompt = `Write clean, working code for: ${args.join(' ')}. Include brief comments.`;
      const reply = await getAIReply(jid, prompt);
      await sock.sendMessage(jid, { text: reply || 'error writing code' });
    }
  },
  '!tr': {
    desc: 'Translate text to any language',
    exec: async ({ sock, jid, args }) => {
      if (args.length < 2) return sock.sendMessage(jid, { text: 'usage: !tr <language> <text>' });
      const lang = args[0];
      const textToTr = args.slice(1).join(' ');
      const reply = await getAIReply(jid, `Translate the following text to ${lang}. Only return the translation:\n${textToTr}`);
      await sock.sendMessage(jid, { text: `🌐 *Translation (${lang})*:\n${reply}` });
    }
  },
  '!grammar': {
    desc: 'Fix grammar and rewrite casually or professionally',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !grammar <text>' });
      const reply = await getAIReply(jid, `Fix the grammar of this text and give 2 options (1 casual, 1 formal):\n${args.join(' ')}`);
      await sock.sendMessage(jid, { text: reply });
    }
  },
  '!forget': {
    desc: 'Wipe conversation history and memory dossier for this chat',
    exec: async ({ sock, jid }) => {
      clearAIChatHistory(jid);
      await clearContactMemory(jid);
      await sock.sendMessage(jid, { text: '🗑️ Wiped conversation history & memory dossier for this chat. Fresh start!' });
    }
  },

  // =====================
  // 2. PRIVACY & CONTROLS
  // =====================
  '!botpersona': {
    desc: 'Toggle sentient hallucinating persona (!botpersona on | off)',
    exec: async ({ sock, jid, msg, args, settings, saveSettings }) => {
      if (!msg.key.fromMe) return; // Owner only
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'on') {
        settings.botPersona = true;
        saveSettings(settings);
        setBotPersonaMode(true);
        await sock.sendMessage(jid, { text: '🌀 *Sentient Persona Activated*\nBot will now hallucinate living its own life, experience sudden mood swings, and take internal bracketed notes.' });
      } else if (mode === 'off') {
        settings.botPersona = false;
        saveSettings(settings);
        setBotPersonaMode(false);
        await sock.sendMessage(jid, { text: '✨ *Normal Persona Restored*\nBot returned to clean digital twin clone.' });
      } else {
        await sock.sendMessage(jid, { text: `current persona mode: ${settings.botPersona ? 'SENTIENT (hallucinating/mood swings)' : 'CLEAN DIGITAL TWIN'}\nusage: !botpersona on | !botpersona off` });
      }
    }
  },

  '!status': {
    desc: 'Check bot status, active model, and settings',
    exec: async ({ sock, jid, msg, settings }) => {
      const accessLabel = (settings.commandAccess || 'user') === 'user' ? 'USER ONLY (owner)' : 'ALL (public)';
      const personaLabel = settings.botPersona ? 'SENTIENT (hallucinating/mood swings)' : 'clean twin';
      const memoryStatus = isCloudflareConfigured ? 'Cloudflare KV (Cloud Edge)' : 'Local RAM / Cache';

      let info = `*Bot Status:*
• Active Model: ${getCurrentModelName()}
• Persona Mode: ${personaLabel}
• Memory Backend: ${memoryStatus}
• Bot Enabled: ${settings.botEnabled ? 'yes' : 'no'}
• Auto Reply: ${settings.autoReply ? 'on' : 'off'}
• Command Access: ${accessLabel}
• Blacklisted: ${settings.blacklist.length} contacts
• Uptime: ${Math.floor(process.uptime() / 60)} mins`;

      if (msg.key.fromMe) {
        info += `\n\n*🤫 Classified (Owner Info):*
• Anti-Delete: ${settings.antiDelete ? 'active' : 'off'}
• Ghost-Read: ${settings.ghostRead ? 'active (no blue ticks)' : 'off'}
• Spy Interceptor: ${settings.spy?.enabled ? `active (target: ${settings.spy.target})` : 'off'}
• Mimic Target: ${getMimicTarget() ? `cloning [${getMimicTarget().name}]` : 'off'}`;
      }
      await sock.sendMessage(jid, { text: info });
    }
  },

  '!profile': {
    desc: 'View or update contact memory dossier (!profile [view|set|clear])',
    exec: async ({ sock, jid, args }) => {
      const sub = (args[0] || 'view').toLowerCase();

      if (sub === 'view') {
        const dossier = await getContactDossier(jid);
        const card = `👤 *Memory Dossier for this Chat:*
• *Name*: ${dossier.name || 'Friend'}
• *Relationship*: ${dossier.summary || 'none recorded'}
• *Recent Discussion*: ${dossier.chatSummary || 'none yet'}
• *Key Facts*: ${dossier.facts && dossier.facts.length ? dossier.facts.join(', ') : 'none recorded'}
• *Interactions Tracked*: ${dossier.interactionCount || 0} messages
• *Last Updated*: ${dossier.lastUpdated ? new Date(dossier.lastUpdated).toLocaleString() : 'just now'}`;
        return sock.sendMessage(jid, { text: card });
      }

      if (sub === 'set') {
        const raw = args.slice(1).join(' ');
        if (!raw.includes('|')) {
          return sock.sendMessage(jid, { text: 'usage: !profile set <Name> | <Relationship> | <Fact 1, Fact 2>\nExample: !profile set Alex | Tech colleague | works remotely, loves coffee' });
        }
        const parts = raw.split('|').map(p => p.trim());
        const name = parts[0] || 'Friend';
        const summary = parts[1] || '';
        const facts = parts[2] ? parts[2].split(',').map(f => f.trim()).filter(Boolean) : [];

        const updated = await setManualProfile(jid, { name, summary, facts });
        return sock.sendMessage(jid, { text: `✅ *Memory Dossier Updated!*\n• Name: ${updated.name}\n• Context: ${updated.summary}\n• Facts: ${updated.facts.join(', ')}` });
      }

      if (sub === 'clear') {
        await clearContactMemory(jid);
        return sock.sendMessage(jid, { text: '🗑️ Cleared memory dossier for this chat.' });
      }

      await sock.sendMessage(jid, { text: 'usage: !profile view | !profile set <Name> | <Summary> | <Facts> | !profile clear' });
    }
  },

  '!user': {
    desc: 'Commands execute ONLY when YOU message them (owner-only mode)',
    exec: async ({ sock, jid, msg, settings, saveSettings }) => {
      if (!msg.key.fromMe) return; // Only owner can change permission
      settings.commandAccess = 'user';
      saveSettings(settings);
      await sock.sendMessage(jid, { text: '🔒 *Command Access Set to USER ONLY*\nCommands will now execute ONLY when YOU message them.' });
    }
  },
  '!all': {
    desc: 'Allow commands to respond when ANYONE messages them',
    exec: async ({ sock, jid, msg, settings, saveSettings }) => {
      if (!msg.key.fromMe) return; // Only owner can change permission
      settings.commandAccess = 'all';
      saveSettings(settings);
      await sock.sendMessage(jid, { text: '🔓 *Command Access Set to ALL*\nAnyone in chats can now trigger bot commands.' });
    }
  },
  '!cmd': {
    desc: 'Toggle command access (!cmd user | !cmd all)',
    exec: async ({ sock, jid, msg, args, settings, saveSettings }) => {
      if (!msg.key.fromMe) return;
      const target = (args[0] || '').toLowerCase();
      if (target === 'user') {
        settings.commandAccess = 'user';
        saveSettings(settings);
        await sock.sendMessage(jid, { text: '🔒 Command access set to USER ONLY' });
      } else if (target === 'all') {
        settings.commandAccess = 'all';
        saveSettings(settings);
        await sock.sendMessage(jid, { text: '🔓 Command access set to ALL' });
      } else {
        await sock.sendMessage(jid, { text: `current command access: ${settings.commandAccess || 'user'}\nusage: !user (owner only) | !all (everyone)` });
      }
    }
  },
  '!bot': {
    desc: 'Master toggle (!bot on / !bot off)',
    exec: async ({ sock, jid, args, settings, saveSettings }) => {
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'on') {
        settings.botEnabled = true;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: 'bot turned on' });
      } else if (mode === 'off') {
        settings.botEnabled = false;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: 'bot turned off' });
      } else {
        await sock.sendMessage(jid, { text: 'usage: !bot on | !bot off' });
      }
    }
  },
  '!auto': {
    desc: 'Toggle auto-reply (!auto on / !auto off)',
    exec: async ({ sock, jid, args, settings, saveSettings }) => {
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'on') {
        settings.autoReply = true;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: 'auto-reply is ON' });
      } else if (mode === 'off') {
        settings.autoReply = false;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: 'auto-reply is OFF (commands only)' });
      } else {
        await sock.sendMessage(jid, { text: 'usage: !auto on | !auto off' });
      }
    }
  },
  '!pause': {
    desc: 'Pause bot for X minutes (e.g. !pause 15)',
    exec: async ({ sock, jid, args, pauseChat }) => {
      const mins = parseInt(args[0]) || 15;
      pauseChat(jid, mins);
      await sock.sendMessage(jid, { text: `paused bot in this chat for ${mins} minutes` });
    }
  },
  '!unpause': {
    desc: 'Unpause bot immediately',
    exec: async ({ sock, jid, unpauseChat }) => {
      unpauseChat(jid);
      await sock.sendMessage(jid, { text: 'unpaused bot in this chat' });
    }
  },
  '!blacklist': {
    desc: 'Manage blacklist (!blacklist add/del/list)',
    exec: async ({ sock, jid, args, settings, saveSettings }) => {
      const sub = (args[0] || '').toLowerCase();
      const num = (args[1] || '').replace(/[^0-9]/g, '');
      if (sub === 'add') {
        if (!num) return sock.sendMessage(jid, { text: 'usage: !blacklist add <number with country code>' });
        if (!settings.blacklist.includes(num)) {
          settings.blacklist.push(num);
          saveSettings(settings);
        }
        return sock.sendMessage(jid, { text: `added ${num} to blacklist` });
      }
      if (sub === 'del' || sub === 'remove') {
        if (!num) return sock.sendMessage(jid, { text: 'usage: !blacklist del <number>' });
        settings.blacklist = settings.blacklist.filter(n => n !== num);
        saveSettings(settings);
        return sock.sendMessage(jid, { text: `removed ${num} from blacklist` });
      }
      if (sub === 'list') {
        const list = settings.blacklist.length ? settings.blacklist.map(n => `• ${n}`).join('\n') : 'blacklist empty';
        return sock.sendMessage(jid, { text: `*Blacklisted numbers:*\n${list}` });
      }
      await sock.sendMessage(jid, { text: 'usage:\n• !blacklist add <num>\n• !blacklist del <num>\n• !blacklist list' });
    }
  },
  '!ping': {
    desc: 'Check bot latency and server status',
    exec: async ({ sock, jid }) => {
      const start = Date.now();
      await sock.sendMessage(jid, { text: 'pong! 🏓' });
      const latency = Date.now() - start;
      console.log(`[Ping]: ${latency}ms`);
    }
  },
  '!jid': {
    desc: 'Get chat or user ID',
    exec: async ({ sock, jid }) => {
      await sock.sendMessage(jid, { text: `*Chat JID*: ${jid}` });
    }
  },

  // ==========================================
  // 2.1 CLASSIFIED & SECRET OPERATIONS (OWNER ONLY)
  // (Hidden from !help, accessible via !secrets)
  // ==========================================
  '!secrets': {
    desc: 'Access classified hidden operations dashboard (Owner only)',
    exec: async ({ sock, jid, msg }) => {
      if (!msg.key.fromMe) return;
      const text = `🤫 *Classified Operations Dashboard (Owner Only)*

• *!ghostread on / off*
  -> Read messages invisibly (keeps grey double-ticks, no blue ticks)

• *!spy target <num|here|all>*
  -> Set contact number or chat to intercept
• *!spy dest <num|here>*
  -> Set destination chat to secretly receive intercepted logs
• *!spy on / off / status*
  -> Toggle silent DM interception & revoke detection

• *!typingloop start [mins] / stop*
  -> Phantom typing psychological loop (leaves them waiting forever)

• *!mimic on [name|num|here] / off / status*
  -> Clone and impersonate a contact using their Cloudflare KV style & life facts
• *!mimic train [name |] <pasted texts>*
  -> Instantly clone someone's style by pasting their texts or quoting them

• *!factcheck <claim>* (or reply to text with !factcheck)
  -> Savage Gen-Z lie detector & calculated probability test

• *!antidelete on / off*
  -> Ghost teaser when someone deletes messages for everyone`;
      await sock.sendMessage(jid, { text });
    }
  },

  '!ghostread': {
    desc: 'Toggle stealth reading mode without blue ticks (!ghostread on | off)',
    exec: async ({ sock, jid, msg, args, settings, saveSettings }) => {
      if (!msg.key.fromMe) return;
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'on') {
        settings.ghostRead = true;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: '👻 *Ghost-Read Activated*\nYou can now read incoming texts without sending blue ticks (remains grey double-ticks).' });
      } else if (mode === 'off') {
        settings.ghostRead = false;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: '👁️ *Ghost-Read Deactivated*\nNormal blue ticks restored.' });
      } else {
        await sock.sendMessage(jid, { text: `current ghost-read status: ${settings.ghostRead ? 'ACTIVE (No Blue Ticks)' : 'OFF (Normal Blue Ticks)'}\nusage: !ghostread on | !ghostread off` });
      }
    }
  },

  '!spy': {
    desc: 'Silent DM interceptor and spy logger (!spy target|dest|on|off|status)',
    exec: async ({ sock, jid, msg, args, settings, saveSettings }) => {
      if (!msg.key.fromMe) return;
      if (!settings.spy) settings.spy = { enabled: false, target: null, dest: null };

      const sub = (args[0] || 'status').toLowerCase();

      if (sub === 'on') {
        if (!settings.spy.target || !settings.spy.dest) {
          return sock.sendMessage(jid, { text: '⚠️ Please set both target and destination first!\nUsage:\n• !spy target <number|here>\n• !spy dest <number|here>\n• !spy on' });
        }
        settings.spy.enabled = true;
        saveSettings(settings);
        return sock.sendMessage(jid, { text: `🕵️ *Spy Interceptor ACTIVATED*\nTarget: ${settings.spy.target}\nDestination: ${settings.spy.dest}\n_Incoming messages and deleted texts will be silently forwarded._` });
      }

      if (sub === 'off') {
        settings.spy.enabled = false;
        saveSettings(settings);
        return sock.sendMessage(jid, { text: '🛑 *Spy Interceptor DEACTIVATED*' });
      }

      if (sub === 'target') {
        let val = args[1];
        if (!val || val === 'here' || val === 'this') {
          val = jid;
        } else if (val.toLowerCase() !== 'all') {
          val = val.replace(/[^0-9]/g, '');
        }
        settings.spy.target = val;
        saveSettings(settings);
        return sock.sendMessage(jid, { text: `🎯 *Spy Target Set*: ${val}` });
      }

      if (sub === 'dest') {
        let val = args[1];
        if (!val || val === 'here' || val === 'this') {
          val = jid;
        } else {
          val = val.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }
        settings.spy.dest = val;
        saveSettings(settings);
        return sock.sendMessage(jid, { text: `📬 *Spy Destination Set*: ${val}` });
      }

      const report = `🕵️ *Spy Interceptor Status:*
• Status: ${settings.spy.enabled ? 'ACTIVE 🟢' : 'OFF 🔴'}
• Target: ${settings.spy.target || 'none set'}
• Destination: ${settings.spy.dest || 'none set'}

Commands:
• !spy target <num|here|all>
• !spy dest <num|here>
• !spy on / !spy off`;
      await sock.sendMessage(jid, { text: report });
    }
  },

  '!typingloop': {
    desc: 'Phantom typing tormentor (!typingloop start [mins] | stop)',
    exec: async ({ sock, jid, msg, args }) => {
      if (!msg.key.fromMe) return;
      const sub = (args[0] || '').toLowerCase();

      if (sub === 'stop' || sub === 'off') {
        if (activeTypingLoops.has(jid)) {
          clearInterval(activeTypingLoops.get(jid).interval);
          clearTimeout(activeTypingLoops.get(jid).timeout);
          activeTypingLoops.delete(jid);
          await sock.sendPresenceUpdate('paused', jid);
          return sock.sendMessage(jid, { text: '🛑 *Phantom Typing Loop Stopped*' });
        }
        return sock.sendMessage(jid, { text: 'no active typing loop in this chat' });
      }

      const mins = parseInt(args[1]) || parseInt(args[0]) || 5;
      const durationMs = mins * 60 * 1000;

      if (activeTypingLoops.has(jid)) {
        clearInterval(activeTypingLoops.get(jid).interval);
        clearTimeout(activeTypingLoops.get(jid).timeout);
      }

      let isComposing = true;
      sock.sendPresenceUpdate('composing', jid).catch(() => {});

      const interval = setInterval(async () => {
        try {
          if (isComposing) {
            await sock.sendPresenceUpdate('paused', jid);
            isComposing = false;
          } else {
            await sock.sendPresenceUpdate('composing', jid);
            isComposing = true;
          }
        } catch (e) {}
      }, 4000);

      const timeout = setTimeout(async () => {
        clearInterval(interval);
        activeTypingLoops.delete(jid);
        await sock.sendPresenceUpdate('paused', jid).catch(() => {});
      }, durationMs);

      activeTypingLoops.set(jid, { interval, timeout });
      await sock.sendMessage(jid, { text: `⏳ *Phantom Typing Loop Activated* for ${mins} mins.\n_They will see typing... paused... typing... but no message will ever arrive 😈_` });
    }
  },

  '!mimic': {
    desc: 'Clone and impersonate a contact using Cloudflare KV profile (!mimic [on|off|status|train])',
    exec: async ({ sock, jid, msg, args }) => {
      if (!msg.key.fromMe) return;
      const sub = (args[0] || '').toLowerCase();

      if (sub === 'off' || sub === 'stop') {
        setMimicMode(null);
        return sock.sendMessage(jid, { text: '✨ *Mimic Mode Deactivated*\nRestored normal digital twin persona.' });
      }

      if (sub === 'status') {
        const current = getMimicTarget();
        if (!current) return sock.sendMessage(jid, { text: 'Mimic Mode is currently OFF (Normal digital twin persona active).' });
        return sock.sendMessage(jid, { text: `🎭 *Active Mimic Target:*\n• Name: ${current.name}\n• Facts: ${current.facts?.length || 0} recorded\n• Slang: ${current.style?.slang?.join(', ') || 'none'}\n• Emojis: ${current.style?.emojis?.join(' ') || 'none'}\n• Casing: ${current.style?.casing || 'mixed'}` });
      }

      if (sub === 'train' || sub === 'learn') {
        let raw = args.slice(1).join(' ').trim();
        let targetName = null;
        let sampleText = raw;

        // Check if message quoted another message
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          const quotedText = quoted.conversation || 
                             quoted.extendedTextMessage?.text || 
                             quoted.imageMessage?.caption || 
                             quoted.videoMessage?.caption || '';
          if (quotedText) {
            sampleText = quotedText + (raw ? `\n${raw}` : '');
            if (args[1] && !args[1].includes('\n') && !args[1].includes(' ')) {
              targetName = args[1];
            }
          }
        }

        if (sampleText.includes('|')) {
          const parts = sampleText.split('|');
          targetName = parts[0].trim();
          sampleText = parts.slice(1).join('|').trim();
        }

        if (!sampleText || sampleText.length < 5) {
          return sock.sendMessage(jid, { 
            text: `usage:\n• !mimic train <paste sample of their texts>\n• !mimic train <Name> | <paste sample texts>\n• Or reply to a friend's message with !mimic train` 
          });
        }

        await sock.sendPresenceUpdate('composing', jid);
        await sock.sendMessage(jid, { text: `🧠 *Cloning Linguistic Profile...*\n_Analyzing sample and extracting slang, life facts, and texting habits to Cloudflare KV..._` });

        const trained = await trainContactProfile(jid, sampleText, targetName);
        await sock.sendPresenceUpdate('paused', jid);

        if (!trained) {
          return sock.sendMessage(jid, { text: 'failed to analyze sample text, please try again' });
        }

        const style = trained.style || {};
        const card = `🧬 *Spotless Mimic Profile Cloned to Memory!*
• *Target Name*: ${trained.name}
• *Summary*: ${trained.summary || 'Friend'}
• *Extracted Facts*: ${trained.facts?.length ? trained.facts.join('; ') : 'inferred from chats'}
• *Cloned Slang*: ${style.slang?.length ? style.slang.join(', ') : 'none detected'}
• *Favorite Emojis*: ${style.emojis?.length ? style.emojis.join(' ') : 'none'}
• *Casing Habit*: ${style.casing || 'mixed'}
• *Punctuation*: ${style.punctuation || 'minimal'}
• *Sample Phrases*: ${style.samplePhrases?.length ? style.samplePhrases.join(' // ') : 'ready'}

_Type *!mimic on* to immediately start impersonating ${trained.name}!_`;

        return sock.sendMessage(jid, { text: card });
      }

      // Query can be args.slice(1) or if user ran "!mimic" or "!mimic on", uses current chat
      let query = args.slice(1).join(' ').trim();
      if (!query || sub === 'this' || sub === 'here' || sub === 'on') {
        query = jid;
      }

      const found = await findDossier(query);
      if (!found || !found.dossier) {
        return sock.sendMessage(jid, { text: `could not find memory dossier for "${query}".\nTip: Run *!mimic train <paste their texts>* to train a profile in 5 seconds!` });
      }

      setMimicMode(found.dossier);
      const style = found.dossier.style || {};
      const card = `🎭 *Mimic Mode Activated: Cloned [${found.dossier.name}]!*
• *Background*: ${found.dossier.summary || 'Friend'}
• *Known Facts*: ${found.dossier.facts?.join(', ') || 'none yet'}
• *Cloned Slang*: ${style.slang?.join(', ') || 'casual'}
• *Favorite Emojis*: ${style.emojis?.join(' ') || '😂'}
• *Casing/Style*: ${style.casing || 'mixed'}
_Bot will now reply 100% in the persona and texting habits of ${found.dossier.name}!_`;
      await sock.sendMessage(jid, { text: card });
    }
  },

  '!factcheck': {
    desc: 'Savage Gen-Z lie detector and probability tester (!factcheck <claim>)',
    exec: async ({ sock, jid, msg, args }) => {
      if (!msg.key.fromMe) return;
      let claim = args.join(' ').trim();

      // Check if message quoted another message
      if (!claim) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          claim = quoted.conversation || 
                  quoted.extendedTextMessage?.text || 
                  quoted.imageMessage?.caption || 
                  quoted.videoMessage?.caption || '';
        }
      }

      if (!claim) {
        return sock.sendMessage(jid, { text: 'usage: !factcheck <claim/flex> or reply to a text with !factcheck' });
      }

      await sock.sendPresenceUpdate('composing', jid);
      const prompt = `You are a savage, witty, sarcastic Gen-Z lie detector and fact-checker. 
Analyze this flex / claim made by someone on WhatsApp:
"${claim}"

Provide a brutal, hilarious 1-2 sentence reality check with an estimated probability calculation (e.g. "Probability of truth: 0.002% 💀"). Keep it funny, short, sarcastic, lowercase.`;
      const reply = await getAIReply(jid, prompt);
      await sock.sendPresenceUpdate('paused', jid);
      await sock.sendMessage(jid, { text: `🔍 *Fact-Check Analysis:*\n${reply}` }, { quoted: msg });
    }
  },

  '!antidelete': {
    desc: 'Toggle anti-delete teasing (!antidelete on | off)',
    exec: async ({ sock, jid, msg, args, settings, saveSettings }) => {
      if (!msg.key.fromMe) return;
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'on') {
        settings.antiDelete = true;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: '🗑️ *Anti-Delete Activated*\nBot will now tease contacts when they delete messages for everyone.' });
      } else if (mode === 'off') {
        settings.antiDelete = false;
        saveSettings(settings);
        await sock.sendMessage(jid, { text: '✨ *Anti-Delete Deactivated*\nBot will ignore deleted messages.' });
      } else {
        await sock.sendMessage(jid, { text: `current anti-delete status: ${settings.antiDelete ? 'ON (active teaser)' : 'OFF'}\nusage: !antidelete on | !antidelete off` });
      }
    }
  },

  // =====================
  // 3. PRODUCTIVITY
  // =====================
  '!stock': {
    desc: 'Live stock prices (e.g. !stock NVDA)',
    exec: async ({ sock, jid, args }) => {
      if (!args[0]) return sock.sendMessage(jid, { text: 'usage: !stock <symbol> (e.g. !stock NVDA or !stock AAPL)' });
      const res = await getStock(args[0]);
      await sock.sendMessage(jid, { text: res });
    }
  },
  '!calc': {
    desc: 'Math calculator (e.g. !calc 50 * 12 + 100)',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !calc <expression>' });
      await sock.sendMessage(jid, { text: calculate(args.join(' ')) });
    }
  },
  '!weather': {
    desc: 'Live weather info (e.g. !weather New York)',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !weather <city>' });
      const res = await getWeather(args.join(' '));
      await sock.sendMessage(jid, { text: res });
    }
  },
  '!wiki': {
    desc: 'Wikipedia summary lookup',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'usage: !wiki <topic>' });
      const res = await getWiki(args.join(' '));
      await sock.sendMessage(jid, { text: res });
    }
  },
  '!remind': {
    desc: 'Set a persistent reminder (!remind in 10m team sync)',
    exec: async ({ sock, jid, args }) => {
      if (args.length < 3 || args[0].toLowerCase() !== 'in') {
        return sock.sendMessage(jid, { text: 'usage: !remind in <time>m/h/s <message>\nexample: !remind in 15m review document' });
      }
      const timeStr = args[1].toLowerCase();
      const message = args.slice(2).join(' ');
      let ms = 0;
      if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60 * 1000;
      else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 60 * 60 * 1000;
      else if (timeStr.endsWith('s')) ms = parseInt(timeStr) * 1000;
      else return sock.sendMessage(jid, { text: 'time must end in s (seconds), m (minutes), or h (hours)' });

      const reminderId = 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const reminder = {
        id: reminderId,
        jid,
        triggerAt: Date.now() + ms,
        message,
        timeStr
      };

      db.reminders.push(reminder);
      saveData(db);

      await sock.sendMessage(jid, { text: `⏰ *Persistent Reminder Set* for ${timeStr}: "${message}"\n_Will alert even if bot restarts!_` });

      setTimeout(async () => {
        try {
          await sock.sendMessage(jid, { text: `🔔 *REMINDER*: ${message}` });
        } catch (e) {}
        db.reminders = db.reminders.filter(r => r.id !== reminderId);
        saveData(db);
      }, ms);
    }
  },
  '!todo': {
    desc: 'Manage to-do list (!todo add/list/done/clear)',
    exec: async ({ sock, jid, args }) => {
      if (!db.todos[jid]) db.todos[jid] = [];
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'add') {
        const item = args.slice(1).join(' ');
        if (!item) return sock.sendMessage(jid, { text: 'usage: !todo add <task>' });
        db.todos[jid].push(item);
        saveData(db);
        return sock.sendMessage(jid, { text: `added to-do: "${item}"` });
      }
      if (sub === 'list') {
        if (!db.todos[jid].length) return sock.sendMessage(jid, { text: 'your to-do list is empty' });
        const list = db.todos[jid].map((t, i) => `${i + 1}. ${t}`).join('\n');
        return sock.sendMessage(jid, { text: `📝 *To-Do List:*\n${list}` });
      }
      if (sub === 'done') {
        const idx = parseInt(args[1]) - 1;
        if (isNaN(idx) || !db.todos[jid][idx]) return sock.sendMessage(jid, { text: 'invalid item number' });
        const removed = db.todos[jid].splice(idx, 1);
        saveData(db);
        return sock.sendMessage(jid, { text: `completed: "${removed[0]}"` });
      }
      if (sub === 'clear') {
        db.todos[jid] = [];
        saveData(db);
        return sock.sendMessage(jid, { text: 'to-do list cleared' });
      }
      await sock.sendMessage(jid, { text: 'usage:\n• !todo add <task>\n• !todo list\n• !todo done <number>\n• !todo clear' });
    }
  },
  '!note': {
    desc: 'Save personal notes (!note add/get/list/del)',
    exec: async ({ sock, jid, args }) => {
      if (!db.notes[jid]) db.notes[jid] = {};
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'add') {
        const title = args[1]?.toLowerCase();
        const content = args.slice(2).join(' ');
        if (!title || !content) return sock.sendMessage(jid, { text: 'usage: !note add <title> <content>' });
        db.notes[jid][title] = content;
        saveData(db);
        return sock.sendMessage(jid, { text: `saved note [${title}]` });
      }
      if (sub === 'get') {
        const title = args[1]?.toLowerCase();
        if (!title || !db.notes[jid][title]) return sock.sendMessage(jid, { text: `note "${title}" not found` });
        return sock.sendMessage(jid, { text: `📌 *Note [${title}]*:\n${db.notes[jid][title]}` });
      }
      if (sub === 'list') {
        const keys = Object.keys(db.notes[jid]);
        if (!keys.length) return sock.sendMessage(jid, { text: 'no saved notes' });
        return sock.sendMessage(jid, { text: `📌 *Saved Notes:*\n${keys.map(k => `• ${k}`).join('\n')}` });
      }
      if (sub === 'del') {
        const title = args[1]?.toLowerCase();
        delete db.notes[jid][title];
        saveData(db);
        return sock.sendMessage(jid, { text: `deleted note [${title}]` });
      }
      await sock.sendMessage(jid, { text: 'usage:\n• !note add <title> <content>\n• !note get <title>\n• !note list\n• !note del <title>' });
    }
  },
  '!poll': {
    desc: 'Create a native WhatsApp poll',
    exec: async ({ sock, jid, args }) => {
      const full = args.join(' ');
      const parts = full.split('|').map(p => p.trim());
      if (parts.length < 3) return sock.sendMessage(jid, { text: 'usage: !poll <question> | <opt1> | <opt2> | [opt3]...' });
      const question = parts[0];
      const options = parts.slice(1);
      await sock.sendMessage(jid, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1
        }
      });
    }
  },

  // =====================
  // 4. FUN, GAMES & BANTER
  // =====================
  '!roast': {
    desc: 'Brutal AI roast',
    exec: async ({ sock, jid, args }) => {
      const target = args.join(' ') || 'me';
      const reply = await getAIReply(jid, `Give a brutal, hilarious, Gen-Z sarcastic roast to: ${target}. Keep it short and funny.`);
      await sock.sendMessage(jid, { text: reply });
    }
  },
  '!flirt': {
    desc: 'Smooth pickup line',
    exec: async ({ sock, jid }) => {
      const reply = await getAIReply(jid, `Give one super smooth, clever, non-cringe pickup line. Just the line.`);
      await sock.sendMessage(jid, { text: reply });
    }
  },
  '!joke': {
    desc: 'Tell a funny joke',
    exec: async ({ sock, jid }) => {
      const reply = await getAIReply(jid, `Tell one genuinely funny, clever joke. Keep it short.`);
      await sock.sendMessage(jid, { text: reply });
    }
  },
  '!dadjoke': {
    desc: 'A classic cheesy dad joke',
    exec: async ({ sock, jid }) => {
      try {
        const res = await fetch('https://icanhazdadjoke.com/', { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        await sock.sendMessage(jid, { text: data.joke || 'couldnt find a dad joke rn' });
      } catch (e) {
        await sock.sendMessage(jid, { text: 'why did the scarecrow win an award? because he was outstanding in his field' });
      }
    }
  },
  '!fact': {
    desc: 'Random mind-blowing fact',
    exec: async ({ sock, jid }) => {
      const reply = await getAIReply(jid, `Tell one mind-blowing, weird, true scientific or historical fact in 1-2 sentences.`);
      await sock.sendMessage(jid, { text: reply });
    }
  },
  '!8ball': {
    desc: 'Magic 8-Ball answers your question',
    exec: async ({ sock, jid, args }) => {
      if (!args.length) return sock.sendMessage(jid, { text: 'ask a question bro (e.g. !8ball will it happen)' });
      const answers = [
        'definitely yes', 'signs point to yes', 'without a doubt', 'bet on it',
        'ask again later', 'better not tell u now', 'cannot predict rn',
        'dont count on it', 'my sources say no', 'nah deadass no', 'very doubtful'
      ];
      const pick = answers[Math.floor(Math.random() * answers.length)];
      await sock.sendMessage(jid, { text: `🎱 *8-Ball*: ${pick}` });
    }
  },
  '!flip': {
    desc: 'Flip a coin (Heads or Tails)',
    exec: async ({ sock, jid }) => {
      const res = Math.random() < 0.5 ? '🪙 *Heads!*' : '🪙 *Tails!*';
      await sock.sendMessage(jid, { text: res });
    }
  },
  '!roll': {
    desc: 'Roll a dice (!roll or !roll 20)',
    exec: async ({ sock, jid, args }) => {
      const sides = parseInt(args[0]) || 6;
      const roll = Math.floor(Math.random() * sides) + 1;
      await sock.sendMessage(jid, { text: `🎲 *Rolled (1-${sides})*: ${roll}` });
    }
  },
  '!ship': {
    desc: 'Love compatibility score between two people',
    exec: async ({ sock, jid, args }) => {
      if (args.length < 2) return sock.sendMessage(jid, { text: 'usage: !ship <name1> <name2>' });
      const pct = Math.floor(Math.random() * 101);
      let comment = 'yall are meant to be fr';
      if (pct < 30) comment = 'toxic as hell run away 💀';
      else if (pct < 60) comment = 'friendzone vibes';
      await sock.sendMessage(jid, { text: `💘 *Ship Test:* ${args[0]} + ${args[1]}\nMatch: *${pct}%* - ${comment}` });
    }
  },
  '!truth': {
    desc: 'Truth or Dare: Get a truth question',
    exec: async ({ sock, jid }) => {
      const reply = await getAIReply(jid, `Give one juicy, interesting truth question for a truth-or-dare game. 1 sentence.`);
      await sock.sendMessage(jid, { text: `🤫 *Truth*: ${reply}` });
    }
  },
  '!dare': {
    desc: 'Truth or Dare: Get a dare challenge',
    exec: async ({ sock, jid }) => {
      const reply = await getAIReply(jid, `Give one funny, mildly chaotic dare challenge for truth or dare. 1 sentence.`);
      await sock.sendMessage(jid, { text: `🔥 *Dare*: ${reply}` });
    }
  },
  '!insult': {
    desc: 'Shakespearean or witty insult',
    exec: async ({ sock, jid }) => {
      const reply = await getAIReply(jid, `Give one super witty, vintage Shakespearean style insult.`);
      await sock.sendMessage(jid, { text: `⚔️ ${reply}` });
    }
  },

  // =====================
  // 5. GROUP UTILITIES
  // =====================
  '!tagall': {
    desc: 'Tag all members in a group',
    exec: async ({ sock, jid, args }) => {
      if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: 'this command only works in group chats' });
      try {
        const meta = await sock.groupMetadata(jid);
        if (!meta || !meta.participants) return sock.sendMessage(jid, { text: 'could not fetch group members' });
        const mentions = meta.participants.map(p => p.id);
        const text = `📢 *Attention Everyone!*\n${args.join(' ') || ''}\n\n` + 
                     meta.participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
        await sock.sendMessage(jid, { text, mentions });
      } catch (err) {
        console.error('[TagAll Error]:', err.message);
        await sock.sendMessage(jid, { text: 'failed to fetch group members' });
      }
    }
  },

  // =====================
  // 6. HELP MENU
  // =====================
  '!help': {
    desc: 'Interactive help menu of all commands',
    exec: async ({ sock, jid, args }) => {
      const category = (args[0] || '').toLowerCase();
      
      if (category === 'ai') {
        return sock.sendMessage(jid, { text: `*🧠 AI Brain Commands:*
• !m1  -> Switch to DiffusionGemma 26B (NVIDIA - Fast & Free)
• !m2  -> Switch to Llama 3.3 70B (NVIDIA - Deep Reasoning)
• !m3  -> Switch to Secondary / OpenAI Compatible
• !m4  -> Switch to Llama 3.2 11B (NVIDIA - Ultra Fast)
• !gen <prompt>  -> Generate AI artwork via FLUX
• !prompt <idea>  -> Expand rough idea into detailed AI prompt
• !ask <query>  -> Direct smart factual answer
• !code <task>  -> Code generator
• !tr <lang> <text>  -> Instant translation
• !grammar <text>  -> Fix / rewrite text
• !forget  -> Clear chat memory` });
      }

      if (category === 'tools' || category === 'productivity') {
        return sock.sendMessage(jid, { text: `*⚡ Productivity Commands:*
• !stock <ticker>  -> Live stock price (e.g. !stock NVDA)
• !calc <math>  -> Math calculator (!calc 45*12)
• !weather <city>  -> Live weather & forecast
• !wiki <topic>  -> Wikipedia summary
• !remind in <10m> <msg>  -> Live reminder timer
• !todo add/list/done/clear  -> Personal task manager
• !note add/get/list/del  -> Personal notebook
• !poll <q> | <o1> | <o2>  -> WhatsApp voting poll` });
      }

      if (category === 'fun') {
        return sock.sendMessage(jid, { text: `*🎲 Fun & Games:*
• !roast <target>  -> Savage AI roast
• !flirt  -> Smooth pickup line
• !joke / !dadjoke  -> Funny joke
• !fact  -> Mind-blowing random fact
• !8ball <question>  -> Magic 8-ball
• !flip  -> Coin flip (Heads/Tails)
• !roll <sides>  -> Dice roll (default d6)
• !ship <u1> <u2>  -> Love compatibility %
• !truth / !dare  -> Truth or dare generator
• !insult  -> Witty Shakespearean insult` });
      }

      if (category === 'controls') {
        return sock.sendMessage(jid, { text: `*🛡️ Privacy & Settings:*
• !botpersona on/off  -> Toggle sentient hallucinating persona
• !user  -> Commands execute ONLY when YOU message them
• !all  -> Allow ANYONE to run commands
• !profile view/set/clear  -> View or tag memory dossier
• !status  -> Bot uptime, active model & access mode
• !bot on / !bot off  -> Master kill switch
• !auto on / !auto off  -> Auto-reply toggle
• !pause <mins>  -> Mute bot in this chat
• !unpause  -> Unmute bot
• !blacklist add <num>  -> Blacklist number
• !blacklist del <num>  -> Un-blacklist number
• !blacklist list  -> View blacklist
• !ping  -> Check bot speed/latency
• !jid  -> Get chat JID` });
      }

      if (category === 'all' || category === 'full') {
        const fullSheet = `*Digital Twin AI - Full Cheat Sheet 🚀*

*🧠 AI Brain:*
• !m1  -> DiffusionGemma 26B (NVIDIA)
• !m2  -> Llama 3.3 70B (NVIDIA)
• !m3  -> Secondary / OpenAI Compatible
• !m4  -> Llama 3.2 11B (NVIDIA)
• !gen <prompt>  -> Generate AI art via FLUX
• !prompt <idea>  -> Expand idea into detailed AI prompt
• !ask <query>  -> Direct smart factual answer
• !code <task>  -> Code generator
• !tr <lang> <text>  -> Instant translation
• !grammar <text>  -> Fix / rewrite text
• !forget  -> Clear chat memory

*⚡ Productivity & Tools:*
• !stock <ticker>  -> Live stock price (e.g. !stock NVDA)
• !calc <math>  -> Math calculator (!calc 45*12)
• !weather <city>  -> Live weather & forecast
• !wiki <topic>  -> Wikipedia summary
• !remind in <10m> <msg>  -> Live reminder timer
• !todo add/list/done/clear  -> Personal task manager
• !note add/get/list/del  -> Personal notebook
• !poll <q> | <o1> | <o2>  -> WhatsApp voting poll

*🎲 Fun & Banter:*
• !roast <target>  -> Savage AI roast
• !flirt  -> Smooth pickup line
• !joke / !dadjoke  -> Funny joke
• !fact  -> Mind-blowing random fact
• !8ball <question>  -> Magic 8-ball
• !flip / !roll  -> Coin flip & dice roll
• !ship <u1> <u2>  -> Compatibility %
• !truth / !dare  -> Truth or dare generator
• !insult  -> Shakespearean insult

*🛡️ Privacy & Permissions:*
• !botpersona on/off  -> Toggle sentient hallucinating persona
• !user  -> Commands execute ONLY when YOU message them
• !all  -> Allow ANYONE to run commands
• !profile view/set/clear  -> View or tag memory dossier
• !status  -> Bot uptime, active model & access mode
• !bot on / !bot off  -> Master kill switch
• !auto on / !auto off  -> Auto-reply toggle
• !pause <mins> / !unpause  -> Mute/unmute chat
• !blacklist add/del/list  -> Mute specific contacts
• !ping / !jid  -> Latency test & chat JID`;
        return sock.sendMessage(jid, { text: fullSheet });
      }

      const overview = `*Digital Twin AI - Command Center 🚀*
Choose a category to view commands:
• *!help ai*        -> 11 AI models, vision & image gen
• *!help tools*     -> 8 Stock, weather, reminders & notes
• *!help fun*       -> 11 Games, roasts, jokes & banter
• *!help controls*  -> 13 Privacy, !user / !all, !profile
• *!help all*       -> Print complete cheat sheet

_Quick shortcuts: !user, !all, !profile, !gen <prompt>, !m1, !status_`;
      await sock.sendMessage(jid, { text: overview });
    }
  }
};

// Aliases
commands['!commands'] = commands['!help'];
commands['!cmdlist'] = commands['!help'];
commands['!everyone'] = commands['!tagall'];
commands['!reset'] = commands['!forget'];
commands['!translate'] = commands['!tr'];
commands['!coin'] = commands['!flip'];
commands['!dice'] = commands['!roll'];
commands['!persona'] = commands['!botpersona'];
commands['!antidel'] = commands['!antidelete'];
commands['!phantom'] = commands['!typingloop'];
commands['!lie'] = commands['!factcheck'];
commands['!cap'] = commands['!factcheck'];
commands['!impersonate'] = commands['!mimic'];
commands['!secret'] = commands['!secrets'];
commands['!ghost'] = commands['!ghostread'];
commands['!train'] = commands['!mimic'];
commands['!learn'] = commands['!mimic'];

// 7. Persistent Reminders Recovery
function initPersistentReminders(sock) {
  if (!db.reminders || !db.reminders.length) return;
  console.log(`[Reminders] Loading ${db.reminders.length} active persistent reminders from disk...`);
  const now = Date.now();
  const remaining = [];

  for (const rem of db.reminders) {
    if (rem.triggerAt <= now) {
      sock.sendMessage(rem.jid, { text: `🔔 *[Missed Reminder during downtime]*: "${rem.message}"` }).catch(() => {});
    } else {
      remaining.push(rem);
      const delay = rem.triggerAt - now;
      setTimeout(async () => {
        try {
          await sock.sendMessage(rem.jid, { text: `🔔 *REMINDER*: ${rem.message}` });
        } catch (e) {}
        db.reminders = db.reminders.filter(r => r.id !== rem.id);
        saveData(db);
      }, delay);
    }
  }

  db.reminders = remaining;
  saveData(db);
}

module.exports = { commands, initPersistentReminders };
