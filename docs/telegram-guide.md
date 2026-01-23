# Telegram Integration Guide

Pinga provides a deep integration with Telegram, functioning not just as a notification bot but as an interactive assistant.

## Setup

1. **Dashboard Setup**:
   - Go to your Pinga Dashboard.
   - Navigate to **Settings** -> **Add Channel**.
   - Create a channel (e.g., "My SaaS Alerts").
   - Click **Connect with Telegram**.

2. **Connecting**:
   - You will be redirected to Telegram with a unique `start` parameter.
   - Click **Start** in the Telegram interface.
   - The bot will reply with a confirmation: _"✅ Channel Connected Successfully!"_

### connecting Group Chats

To connect a group chat:

1. Add the bot (`@PingaBot` or your custom bot name) to the group.
2. Ensure the bot has **Admin** privileges (specifically "Manage Messages" to see commands/mentions).
3. In your dashboard, generate the connection link for your channel.
4. The link format is usually `https://t.me/yourbot?start=channel_...`.
5. You can copy the code part (e.g., `channel_USERID_INDEX`) and send `/start channel_USERID_INDEX` inside the group chat.

## Commands

- `/start`: Initializes the bot and shows a welcome message.
- `/start <token>`: Links a channel or user account.
- `/help`: Shows setup instructions and tips.

## Features

### 1. Notifications

You will receive formatted alerts for configured webhooks. These often include standard emojis:

- ⭐ Stargazers
- 🐛 Issues
- 🚀 Deployments

### 2. AI Assistant & Mentions

- **Direct Messages**: The bot will reply to _every_ text message you send it in DM, treating it as a conversation with your AI assistant.
- **Group Chats**: The bot will **only** reply if:
  - You explicitly **reply** to one of its messages.
  - You **mention** it by username (e.g., `@PingaBot list my tasks`).

### 3. Voice Commands

You can send voice notes to the bot (DMs only recommended).

1. Record a voice message.
2. The bot will transcribe it: _"🎤 I heard: 'Deploy via Vercel'"_
3. Reply with **"YES"**, **"OK"**, or **"CONFIRM"**.
4. The bot will execute the transcribed command (simulating a text command).
