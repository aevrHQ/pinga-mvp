# Pinga - Universal Webhook Notification System

Pinga is a multi-tenant SaaS platform that turns webhooks (GitHub, Render, etc.) into rich, structured notifications for Telegram and Slack. Designed for developers who want to stay in the loop without the noise.

## 🚀 Features at a Glance

- **Multi-Channel**: Seamless support for **Telegram** and **Slack**.
- **AI-Powered**: Chat with your notifications, ask questions, and use voice commands.
- **Secure**: Passwordless auth (Magic Link, OTP) + Local PIN protection.
- **Multi-Tenant**: Isolated environments for every user.
- **Easy Integration**: One-click connection flows and simple webhook endpoints.

## 📚 Documentation

Detailed guides are available in the `docs/` directory:

- [**Features Breakdown**](./docs/features.md) - Deep dive into what Pinga can do.
- [**Telegram Guide**](./docs/telegram-guide.md) - How to set up and use the Telegram bot.
- [**Slack Guide**](./docs/slack-guide.md) - Connecting Slack channels and threading.
- [**API Reference**](./docs/api-reference.md) - Technical details on webhook endpoints.

## 🛠 Quick Start (Development)

### Prerequisites

- Node.js 18+
- MongoDB (Local or Atlas)
- ngrok (for exposing localhost to webhooks)

### Installation

1.  **Clone the repository**
    \`\`\`bash
    git clone https://github.com/aevrHQ/pinga-mvp.git
    cd pinga-mvp
    \`\`\`

2.  **Install dependencies**
    \`\`\`bash
    npm install
    \`\`\`

3.  **Configure Environment**
    Copy \`apps/web/.env.example\` to \`apps/web/.env.local\` and fill in the secrets (MongoDB URI, Telegram Token, etc.).

4.  **Run Development Server**
    \`\`\`bash
    npm run dev
    \`\`\`
    Visit [http://localhost:3000](http://localhost:3000).

### Receiving Webhooks Locally

Expose your local server using ngrok:

\`\`\`bash
ngrok http 3000
\`\`\`

Use the provided https URL to set up your Telegram/Slack webhooks.

## 🏗 Architecture

- **Frontend/API**: Next.js 16 (App Router)
- **Database**: MongoDB (Mongoose)
- **AI**: Vercel AI SDK + Groq
- **Styling**: TailwindCSS + Motion

## License

MIT
