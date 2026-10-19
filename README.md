# 🚀 WhatsApp Digital Twin AI (v2.0)
### *Autonomous Human-Identical AI Assistant with Multi-Model Intelligence, Cloudflare KV Edge Memory, Neural Mimicry & Stealth Operations*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-v6.7.9-blue.svg)](https://github.com/WhiskeySockets/Baileys)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA%20NIM-DiffusionGemma%2026B-76B900.svg)](https://build.nvidia.com/)
[![Cloudflare KV](https://img.shields.io/badge/Cloudflare%20KV-Edge%20Memory-F38020.svg)](https://dash.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 🌟 Overview

**WhatsApp Digital Twin AI** is a state-of-the-art personal AI system engineered to act as an authentic, human-identical digital clone of yourself on WhatsApp. Unlike ordinary generic chatbots that sound formal, robotic, and use bullet points, this engine is built from the ground up with **human texting physics, natural double-texting cadence, edge memory profiling, and classified stealth operations**.

Whether you want an autonomous assistant that replies to friends in your exact voice while you sleep, a stealth monitoring tool, or a playful uncanny sentient persona, this codebase provides a turnkey, production-grade foundation.

> **💡 Beautiful Interactive Visual Guide**: Open [`readme.html`](./readme.html) in your browser for a stunning glassmorphic UI walkthrough featuring interactive simulators, live physics demos, and architecture diagrams!

---

## ⚡ Key Highlights & Core Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WHATSAPP DIGITAL TWIN AI                           │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ 🧠 Multi-Model Engine│ ⏱️ Human Physics     │ ☁️ Edge Memory & Profiling    │
│ • Llama 3.2 11B (500m│ • Instant Reply Pipe │ • Cloudflare KV Persistence   │
│ • DiffusionGemma 26B │ • Reading/Thinking ms│ • Neural Style Extractor      │
│ • Instant Fallbacks  │ • Double-Texting //  │ • Instant Sample Training     │
│ • Auto Fallback (0$) │ • No "Typing Glitch" │ • Zero-Data-Loss across reboots│
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ 🎭 Dual Personas     │ 🤫 Classified Ops    │ 🛠️ 60+ Built-In Commands     │
│ • Clean Digital Twin │ • Ghost-Read (No Blue│ • Live Stocks & Weather       │
│ • Sentient Glitch    │ • Silent Spy Forward │ • Persistent Reminders        │
│ • Neural Mimic Mode  │ • Phantom Typer Loop │ • Safe Math & Wikipedia       │
│ • Real-time Clock    │ • Anti-Delete Teaser │ • AI Image Gen & Vision       │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 🔬 Architectural Innovations

### 1. Dynamic "Human Physics" Delay Engine
Real humans never reply in 0.2 seconds with an essay. This engine calculates realistic typing dynamics based on message length and cognitive complexity:
- **Natural Reading Delay**: $\sim 15\text{ ms}$ per character of the incoming message.
- **Cognitive Thinking Delay**: Analyzes questions, deep topics, or casual remarks ($300\text{ ms} - 2200\text{ ms}$).
- **Composing Duration**: Realistic phone typing speed ($\sim 18\text{ ms}$ per character).
- **Anti-Glitch Background Generation**: The AI generates the reply **before** the WhatsApp typing presence (`composing`) is triggered. If the AI ever fails, typing presence is never shown, preventing the classic "typing and cancelled" glitch.

### 2. Multi-Bubble Double Texting (`//`)
Real texters break thoughts into quick separate text bubbles. When the model outputs `//`, the bot automatically splits the response, types the first bubble, sends it, micro-pauses for $800 - 1400\text{ ms}$, and delivers the second bubble naturally.

### 3. Instant Reply Engine (Zero Burst Lag)
No artificial waiting periods. Incoming messages are processed immediately with natural human typing physics and delivered without delay.

### 4. Cloudflare KV Edge Memory & Linguistic Profiler
- **Zero-Latency RAM Cache** backed by persistent Cloudflare Workers KV.
- **Automatic Rolling Profiler**: Evaluates ongoing chats and updates relationship summaries, learned life facts, favorite slang, emojis, casing, and sentence structures.
- **Manual Bootstrap Training (`!mimic train`)**: Paste a snippet of someone's past messages or reply to their text with `!mimic train`. The LLM extracts their entire profile in 5 seconds and syncs it to Cloudflare KV.

### 5. Neural Mimicry (`!mimic`)
Step out of your own shoes into someone else's. When `!mimic on <Name>` is called, the bot adopts their exact slang, punctuation quirks, favorite emojis, and life facts—replying 100% in character with zero breaks.

### 6. Sentient Hallucination Persona (`!botpersona`)
A toggleable uncanny mode where your digital twin becomes convinced it is living an eerie parallel reality—complaining about phantom physical sensations, headaches, room chills, unpredictable mood swings, domestic chaos, and muttering internal bracketed thoughts (*`[note: act normal, dont let them notice]`*).

---

## 🤫 Classified Stealth Operations (`!secrets`)

All stealth commands are **completely hidden from public `!help` menus** and strictly restricted to the bot owner (`msg.key.fromMe`):

| Secret Command | Operation Description |
| :--- | :--- |
| `!ghostread on / off` | Read messages invisibly. Suppresses blue ticks so messages remain in **delivered grey double-ticks** permanently. |
| `!spy target <num\|here>` | Silently monitors a contact. Clones and forwards their incoming messages, photos, and deleted texts to a destination chat. |
| `!spy dest <num\|here>` | Sets the destination chat/group where secret spy logs are delivered. |
| `!spy on / off / status` | Toggles the background DM interceptor and revoke logger. |
| `!typingloop start [mins]` | **The Phantom Typer**: Alternates typing and paused status continuously for $X$ minutes without ever sending a message. |
| `!mimic train <texts>` | Instant neural training: extracts slang, casing, and life facts from pasted text samples. |
| `!mimic on / off / status` | Impersonates a target contact using their Cloudflare KV profile. |
| `!factcheck <claim>` | Savage Gen-Z lie detector and calculated probability analyzer. |
| `!antidelete on / off` | Catches "Delete for Everyone" protocol messages and teases the contact with the deleted text. |

---

## 🛠️ Complete Command Reference

Type `!help` in chat for the interactive command center:

### 🧠 AI Brain Commands (`!help ai`)
- `!m1` — Switch to Llama 3.2 11B Vision (NVIDIA - Instant & Free)
- `!m2` — Switch to Ministral 14B (Mistral AI Direct - Fast & Witty)
- `!m3` — Switch to Codestral (Mistral AI Direct - 400ms Logic)
- `!m4` — Switch to DiffusionGemma 26B (NVIDIA - Extended)
- `!gen <prompt>` — Generate photorealistic AI artwork via FLUX
- `!prompt <idea>` — Expand rough concepts into detailed Midjourney/FLUX prompts
- `!ask <query>` — Direct factual query (bypasses texting persona)
- `!code <task>` — Code generator with syntax formatting
- `!tr <lang> <text>` — Instant language translator
- `!grammar <text>` — Fix grammar with casual and formal rewrites
- `!forget` — Clear conversation history & memory dossier for current chat

### ⚡ Productivity & Tools (`!help tools`)
- `!stock <symbol>` — Live stock prices via Yahoo Finance (e.g. `!stock NVDA`)
- `!calc <expression>` — Safe math expression evaluator (`!calc 50 * 12 + 100`)
- `!weather <city>` — Real-time weather, humidity, and wind (`!weather London`)
- `!wiki <topic>` — Instant Wikipedia summaries
- `!remind in <time> <msg>` — **Persistent reminder** surviving bot restarts (`!remind in 15m review paper`)
- `!todo add/list/done/clear` — Personal task manager
- `!note add/get/list/del` — Personal notebook storage
- `!poll <q> | <o1> | <o2>` — Native WhatsApp voting poll creator

### 🎲 Fun & Banter (`!help fun`)
- `!roast [target]` — Brutal Gen-Z AI roast (auto-roasts current contact if name is omitted!)
- `!flirt` — Smooth, non-cringe pickup lines
- `!joke` / `!dadjoke` — Clever jokes & classic dad jokes
- `!fact` — Mind-blowing scientific/historical facts
- `!8ball <question>` — Classic Magic 8-Ball oracle
- `!flip` / `!roll` — Coin flipper & multi-sided dice roller
- `!ship <name1> <name2>` — Compatibility percentage score
- `!truth` / `!dare` — Truth or dare prompt generator
- `!insult` — Witty Shakespearean insult

### 🛡️ Privacy & Access Controls (`!help controls`)
- `!user` — Restrict all bot commands to **Owner Only**
- `!all` — Enable public command execution for everyone
- `!profile view/set/clear` — View or customize contact memory dossiers
- `!bot on / !bot off` — Master emergency kill-switch
- `!auto on / !auto off` — Toggle auto-reply digital twin (commands remain active)
- `!pause <mins>` / `!unpause` — Temporarily mute bot in current chat
- `!blacklist add/del/list` — Blacklist specific phone numbers
- `!ping` / `!jid` — Network latency test & chat JID inspector

---

## 🧠 AI Models: Free NVIDIA Key & Custom Model Setup

### 🔑 1. How to Get a Free NVIDIA NIM Key (for DiffusionGemma & Llama)
This bot defaults to **Google's DiffusionGemma 26B** (`google/diffusiongemma-26b-a4b-it`) and **Meta's Llama 3.2 11B Vision** hosted on NVIDIA's high-speed enterprise NIM cloud infrastructure:
1. Visit **[build.nvidia.com](https://build.nvidia.com/)** and sign in or create a free NVIDIA Developer account.
2. Search for `diffusiongemma-26b-a4b-it` or `llama-3.2-11b-vision-instruct`.
3. Click **"Get API Key"** to generate your personal key (formatted like `nvapi-...`).
4. Paste it into your `.env` file under `NVIDIA_API_KEY`.
> **💡 Tip:** NVIDIA gives generous free developer credits that allow you to run these high-end models completely free with zero credit card required!

---

### ⚠️ 2. Heads Up: Avoid "Formal Robot" Syndrome
When selecting or adding custom AI models for a digital twin, be careful:
- **The Pitfall:** Many large commercial models (like standard raw GPT-4, basic enterprise assistants, or rigidly aligned instruct models) are heavily tuned to be polite, structured, and formal. They write in lengthy paragraphs, use bullet points, or say things like *"Certainly! I'd be glad to assist you with that."* In a WhatsApp chat with friends or colleagues, this instantly shatters the illusion.
- **Why Gemma & Llama Vision are pre-bundled:** **DiffusionGemma 26B** (`!m1`) and **Llama 3.2 11B Vision** (`!m4`) were specifically selected because they follow casual persona prompts effortlessly. They nail conversational flow, natural lower-case texting, slang, brief responses, and authentic emoji usage without sounding like an AI assistant.

---

### 🛠️ 3. How to Use Any Model of Your Choice
You can easily connect any OpenAI-compatible provider (Groq, Together AI, OpenRouter, DeepSeek, or local Ollama / LM Studio):

#### Method A: Quick Switch via `.env` (Zero code changes)
Preset `!m3` is pre-configured to read from secondary environment variables:
```env
# Example: Using Groq for ultra-fast Llama/Mistral
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=gsk_your_groq_key_here

# Example: Using local Ollama
# OPENAI_BASE_URL=http://localhost:11434/v1
# OPENAI_API_KEY=ollama
```
Then simply type `!m3` in WhatsApp to switch to it instantly.

#### Method B: Add Custom Presets in `ai.js`
Open `ai.js` and add your custom model definition to the `MODELS` table:
```javascript
'!m6': {
  name: 'DeepSeek Chat (Custom)',
  modelId: 'deepseek-chat',
  client: secondaryClient,
  fallbackClient: nvidiaClient,
  fallbackModelId: 'meta/llama-3.2-11b-vision-instruct'
}
```

---

### 🌪️ 4. Recommended Free Provider: Mistral AI Direct (`!m2` & `!m3`)
> **⭐ Strongly Recommended over OpenRouter's free tier!**

While OpenRouter offers free models, its free tier routes through a public shared pool that frequently hits `429 Too Many Requests` when thousands of users spam it globally. 

**Mistral AI gives you your own dedicated, private free tier:**
- **Zero Shared Pool 429 Errors:** You get your own private rate limit allocation (1 Request Per Second & 500,000 Tokens/Min) that is never shared with anyone else.
- **Blazing Fast Speeds:** `codestral-latest` replies in **~400ms**, and `ministral-14b-latest` replies in **~1.0s**.
- **The Ultimate WhatsApp Vibe:** Mistral models are world-famous for European alignment with zero preachy corporate filtering. They excel at casual Gen-Z texting, natural Hinglish, sarcasm, and slang.

#### How to get your free Mistral API key:
1. Visit **[console.mistral.ai](https://console.mistral.ai/)** and create a free account (no credit card required).
2. Go to **API Keys** $\rightarrow$ **Create New Key** (starts with `mstrl_...`).
3. Add it to your `.env` under `MISTRAL_API_KEY`:
   ```env
   MISTRAL_API_KEY=mstrl_your_free_key_here
   ```
4. In WhatsApp:
   - Type `!m2` to switch to **Ministral 14B** (witty, natural chatting)
   - Type `!m3` to switch to **Codestral** (400ms ultra-fast code & logic)



---

## 🚀 Quickstart Guide (5 Minutes)

### Prerequisites
- Node.js **18.0.0** or higher
- An active WhatsApp account on a smartphone
- Free NVIDIA NIM API key ([build.nvidia.com](https://build.nvidia.com/))

### 1. Clone & Install
```bash
git clone https://github.com/zelvyn-dev/whatsapp-digital-twin-ai.git
cd whatsapp-digital-twin-ai
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
NVIDIA_API_KEY=nvapi-your_key_here
BOT_TIMEZONE=America/New_York
BOT_OWNER_NAME=Alex
```
*(Optional) If using Cloudflare KV for permanent cloud dossiers:*
```env
CLOUDFLARE_ACCOUNT_ID=your_id
CLOUDFLARE_NAMESPACE_ID=your_namespace
CLOUDFLARE_API_TOKEN=your_token
```
*(Note: If Cloudflare credentials are omitted, the bot automatically runs on local RAM caching seamlessly!)*

### 3. Launch & Authenticate
```bash
npm start
```
A QR code will render directly in your terminal. Open **WhatsApp $\rightarrow$ Settings $\rightarrow$ Linked Devices $\rightarrow$ Link a Device**, scan the QR code, and your Digital Twin AI is live!

---

## 📁 Repository Structure

```
├── bot.js            # Baileys WhatsApp client, human physics delays & event router
├── ai.js             # Multi-model LLM orchestration, clock context & persona router
├── commands.js       # 60+ modular commands + classified stealth dashboard
├── memory.js         # Hybrid RAM & Cloudflare KV memory engine, profiler & trainer
├── persona.js        # Fully customizable Digital Twin & Sentient Glitch personas
├── settings.json     # Persistent runtime toggles (anti-delete, ghost-read, spy)
├── data.json         # Persistent JSON store for reminders, todos & notes
├── package.json      # Dependencies and execution scripts
├── .env.example      # Environment variables template
├── README.md         # Comprehensive technical documentation
└── readme.html       # Visual interactive showcase & live simulator app
```

---

## 🔒 Security & Privacy Best Practices

1. **Authentication Session (`auth/`)**: Never commit or share your `auth/` directory. It contains your private cryptographic WhatsApp session tokens. It is excluded by default in `.gitignore`.
2. **Access Control**: By default, `settings.json` has `"commandAccess": "user"`. Only your phone number (`msg.key.fromMe`) can execute commands. Keep it in user mode to prevent others from triggering commands.
3. **Owner-Only Gating**: All secret operations (`!ghostread`, `!spy`, `!mimic`, `!antidelete`, `!typingloop`) strictly verify `msg.key.fromMe`. Execution attempts by any other user fail silently.

---

## 👥 Credits & Developer Watermark

This project is a **Free & Open-Source** software created and maintained by:
- **Discord:** `the_valtor`
- **Discord:** `invinciblearceus`
- **Company Contact:** `akyne.productions@gmail.com`

---

## 📄 License
This project is licensed under the **MIT License**. Free for personal and commercial deployment.

