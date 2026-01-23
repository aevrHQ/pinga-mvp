# Slack Integration Guide

Pinga integrates with Slack to bring notifications and AI assistance directly into your workspace channels.

## Setup

1. **Dashboard Setup**:
   - Go to your Pinga Dashboard.
   - Create a generic "Slack" channel in your settings if you haven't already.

2. **Slack App Configuration**:
   - Ensure the Pinga Slack App is installed in your workspace.
   - Invite the bot user to the desired channel: `/invite @Pinga`

## Linking a Channel

Unlike Telegram, Slack does not support deep linking with parameters in the same way. We use a text-based linking method.

1. Go to your **Pinga Dashboard** -> **Settings**.
2. Find the channel you want to link.
3. Look for the linking code/ID (internally this is `channel_USERID_INDEX`).
4. In your Slack channel, type:
   ```
   link channel_<USERID>_<INDEX>
   ```
   _Example: `link channel_65a4b3c_0`_
5. The bot will reply: _"✅ Channel Connected Successfully!"_

## Features

### 1. Notifications

Webhooks are delivered as rich messages to the linked Slack channel.

### 2. AI Conversations

The bot listens for mentions (`@app_mention`) and messages in channels it is part of.

- To chat with the bot, simply mention it: `@Pinga how are the server stats?`
- The bot replies in **Threads** to keep the main channel clean.
- History is preserved for context-aware replies.
