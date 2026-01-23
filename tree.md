.
├── README.md
├── apps
│   ├── agent-host
│   └── web
│       ├── README.md
│       ├── app
│       │   ├── api
│       │   │   ├── auth
│       │   │   │   ├── magic-link
│       │   │   │   │   ├── request
│       │   │   │   │   │   └── route.ts
│       │   │   │   │   └── verify
│       │   │   │   │       └── route.ts
│       │   │   │   ├── otp
│       │   │   │   │   └── verify
│       │   │   │   │       └── route.ts
│       │   │   │   ├── pin
│       │   │   │   │   ├── login
│       │   │   │   │   │   └── route.ts
│       │   │   │   │   └── set
│       │   │   │   │       └── route.ts
│       │   │   │   └── slack
│       │   │   │       └── callback
│       │   │   │           └── route.ts
│       │   │   ├── user
│       │   │   │   └── settings
│       │   │   │       └── route.ts
│       │   │   └── webhook
│       │   │       ├── [source]
│       │   │       │   └── route.ts
│       │   │       ├── payload
│       │   │       │   └── [id]
│       │   │       │       └── route.ts
│       │   │       ├── route.ts
│       │   │       ├── slack
│       │   │       │   └── route.ts
│       │   │       └── telegram
│       │   │           └── route.ts
│       │   ├── dashboard
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── settings
│       │   │       ├── NotificationChannelsForm.tsx
│       │   │       ├── PinSettingsForm.tsx
│       │   │       ├── PreferencesForm.tsx
│       │   │       ├── SettingsForm.tsx
│       │   │       ├── WebhookFilterForm.tsx
│       │   │       ├── WebhookInfo.tsx
│       │   │       └── page.tsx
│       │   ├── favicon.ico
│       │   ├── globals.css
│       │   ├── help
│       │   │   └── [[...slug]]
│       │   │       └── page.tsx
│       │   ├── layout.tsx
│       │   ├── login
│       │   │   └── page.tsx
│       │   └── page.tsx
│       ├── components.json
│       ├── content
│       │   ├── filtering.md
│       │   ├── getting-started.md
│       │   ├── render.md
│       │   ├── sources.md
│       │   └── telegram-groups.md
│       ├── eslint.config.mjs
│       ├── lib
│       │   ├── agents
│       │   │   ├── chatAssistant.ts
│       │   │   ├── eventSummary.ts
│       │   │   └── tools.ts
│       │   ├── ai.ts
│       │   ├── auth.ts
│       │   ├── email.ts
│       │   ├── encryption.ts
│       │   ├── markdown.ts
│       │   ├── mongodb.ts
│       │   ├── notification
│       │   │   ├── channels
│       │   │   │   ├── discord.ts
│       │   │   │   ├── slack.ts
│       │   │   │   ├── telegram.ts
│       │   │   │   └── webhook.ts
│       │   │   ├── service.ts
│       │   │   └── types.ts
│       │   ├── stats.ts
│       │   ├── transcription.ts
│       │   ├── utils.ts
│       │   └── webhook
│       │       ├── analyzers
│       │       │   ├── generic.ts
│       │       │   ├── github.ts
│       │       │   ├── render.ts
│       │       │   └── vercel.ts
│       │       ├── analyzers.ts
│       │       ├── config.ts
│       │       ├── slack.ts
│       │       ├── storage.ts
│       │       └── telegram.ts
│       ├── models
│       │   ├── Channel.ts
│       │   ├── Installation.ts
│       │   ├── MagicLinkToken.ts
│       │   ├── NotificationLog.ts
│       │   ├── User.ts
│       │   └── WebhookEvent.ts
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package-lock.json
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── proxy.ts
│       ├── public
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── scripts
│       │   ├── reproduce-otp.js
│       │   ├── test-ai-personality.ts
│       │   ├── test-chat-assistant.ts
│       │   ├── test-encryption.ts
│       │   ├── test-telegram-group.js
│       │   └── verify-webhook-reply.js
│       └── tsconfig.json
├── docs
│   ├── api-reference.md
│   ├── features.md
│   ├── slack-guide.md
│   └── telegram-guide.md
├── package-lock.json
├── package.json
├── packages
├── tools
│   └── render-email-forwarder.js
├── tree.md
└── web

44 directories, 95 files
