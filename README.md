# Pinga - Universal Webhook Notification System

Pinga is a multi-tenant SaaS platform that turns webhooks (GitHub, Render, etc.) into rich, structured Telegram notifications. It is designed for developers and teams who want to keep track of their projects without spamming their channels with raw JSON.

## 🚀 Features

- **Multi-tenant SaaS**: Each user gets their own dashboard and isolated environment.
- **Authentication**: Secure passwordless login via **Magic Link** and **OTP**.
- **Quick Access**: Set a **4-digit PIN** for faster login on trusted devices.
- **Dashboard**: Manage connected repositories and view live webhook activity.
- **One-Click Connections**: Instantly link your Telegram account via deep links.
- **Rich Notifications**: Beautifully formatted messages with emojis and action links.

---

## 📖 User Guide

### 1. Getting Started

- Visit the [Pinga Dashboard](https://pinga-mvp-web.vercel.app).
- Enter your email address to receive a **Magic Link**.
- Click the link in your email (or enter the 6-digit OTP code) to log in.

### 2. Connect Telegram

- Navigate to **Settings**.
- Click **Connect with One Click**.
- This will open Telegram and start the `@pingapingbot`.
- The bot will confirm: _"✅ Successfully connected..."_

### 3. Receive Notifications

- In the **Overview** page, click **Add Repository**.
- Install the Pinga GitHub App on your desired repositories.
- That's it! You will now receive alerts for:
  - ⭐ New Stars
  - 🐛 Issues Opened/Closed
  - 🔄 Pull Request Updates
  - 🚀 Deployments

### 4. Enable PIN Login (Optional)

- Go to **Settings** -> **Security**.
- Enter a 4-digit PIN (e.g., `1234`) and save.
- Next time you log in, click **"Login with PIN instead"** to skip the email verification!

---

## 💻 Developer Guide

### Prerequisites

- Node.js 18+
- MongoDB (Local or Atlas)
- ngrok (for local webhook testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/aevrHQ/pinga-mvp.git
cd pinga-mvp

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and set the following:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/pinga-mvp

# Authentication (JWT)
ACCESS_TOKEN_SECRET=your-super-secret-key-at-least-32-chars

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_default_chat_id

# Email (SMTP or Gmail)
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password

# App URL (Important for Magic Links)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Webhook Development (Local)

To receive webhooks locally, you must expose your localhost via `ngrok`:

1.  Run ngrok:
    ```bash
    ngrok http 3000
    ```
2.  Set your Telegram Webhook:
    ```bash
    curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<YOUR-NGROK-ID>.ngrok-free.app/api/webhook/telegram"
    ```
3.  Set your GitHub App Webhook URL to:
    `https://<YOUR-NGROK-ID>.ngrok-free.app/api/webhook/github`

### Deployment (Vercel)

1.  Push to GitHub.
2.  Import project into Vercel.
3.  Add all **Environment Variables** in Vercel Settings.
    - **Important**: Use a cloud MongoDB URI (e.g., MongoDB Atlas).
    - Set `NEXT_PUBLIC_BASE_URL` to your Vercel domain.
4.  Update Telegram Webhook for production:
    ```bash
    curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<YOUR-VERCEL-DOMAIN>/api/webhook/telegram"
    ```

---

## 🛠 Architecture

- **Frontend**: Next.js 16 (App Router)
- **Database**: MongoDB (Mongoose)
- **Styling**: TailwindCSS + Lucide Icons + Motion
- **Auth**: Custom JWT + Magic Link/OTP system
- **Validation**: Zod formatting

## License

MIT
