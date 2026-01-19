# pinga mvp

Monorepo for Pinga - Webhook notification system for Telegram.

## Structure

```
├── apps/
│   └── web/          # Next.js webhook bot
└── packages/         # Shared packages (future)
```

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and configure:

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## Webhook Endpoints

- `POST /api/webhook` - Auto-detect source
- `POST /api/webhook/vercel` - Vercel webhooks
- `POST /api/webhook/github` - GitHub webhooks
- `POST /api/webhook/render` - Render webhooks
- `GET /api/webhook/payload/[id]` - View payload
