# Bot SBV Discord 🤖

A TypeScript bot for automating access and member management in paid Discord communities.

---

## 📋 About

When a sale is approved, the bot automates the entire onboarding flow — from generating a unique invite to assigning the correct role — with zero manual intervention.

---

## 🔄 How It Works

```
Sale approved
      ↓
n8n generates a unique invite and sends it via email to the customer
      ↓
Customer joins the server using the link
      ↓
Bot detects which invite was used
      ↓
n8n cross-references the spreadsheet and identifies the product
      ↓
Role automatically assigned to the member
```

---

## 🚀 Tech Stack

| Technology | Purpose |
|---|---|
| **TypeScript** | Main language |
| **Node.js** | Runtime |
| **discord.js** | Discord API integration |
| **Axios** | HTTP requests |
| **dotenv** | Environment variable management |
| **n8n** | Workflow automation |
| **Google Sheets** | Data storage |

---

## 🏗️ Architecture

```
src/
├── DTO/
│   └── DTOs-bot.ts       ← Data Transfer Objects
└── bot.ts                ← Main file with all classes
```

### Classes

- **`InviteCache`** — Stores and manages invite cache per server
- **`WebhookService`** — Sends payloads to n8n and handles responses
- **`BotService`** — Orchestrates invite detection and member join logic
- **`DiscordBot`** — Initializes the bot and listens to Discord events

---

## ⚙️ Environment Variables

Create a `.env` file in the root of the project:

```env
DISCORD_TOKEN=your_bot_token_here
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/bot-sbv-discord.git

# Navigate to the project folder
cd bot-sbv-discord

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build & Start

```bash
# Compile TypeScript
npm run build

# Start compiled bot
npm run start
```

---

## 📦 Deployment

The bot is deployed on **Railway** with continuous deployment via GitHub, ensuring 24/7 availability and zero-downtime updates.

### Deploy on Railway

1. Push your code to GitHub
2. Connect your repository to Railway
3. Add environment variables in Railway → Variables
4. Railway automatically builds and deploys on every push

---

## 📄 License

This project is private and proprietary. All rights reserved.
