# API Reference

Pinga exposes standardized endpoints for ingesting notifications from external services.

## Webhooks

The primary endpoint for sending events to Pinga is:

\`\`\`
POST /api/webhook/:source
\`\`\`

### Path Parameters

- \`:source\`: The name of the platform sending the webhook (e.g., \`github\`, \`render\`, \`stripe\`, \`custom\`).

### Query Parameters

- \`userId\` (Required for generic webhooks): The MongoDB ID of the user who should receive the notification.
  - _Note: For GitHub App installations, this is not required as routing is handled via Installation ID._

### Headers

- \`Content-Type\`: \`application/json\`
- \`X-GitHub-Event\`: (Optional) Sent by GitHub to specify the event type (e.g., \`push\`, \`issues\`).

### Payload

Accepts any JSON body. Pinga attempts to structure known formats (like GitHub) and provides a raw summary for others.

### Examples

#### 1. Generic Notification (cURL)

Send a custom alert to your Pinga account.

\`\`\`bash
curl -X POST "https://your-pinga-instance.com/api/webhook/custom?userId=YOUR_USER_ID" \
 -H "Content-Type: application/json" \
 -d '{
"event": "deployment_success",
"service": "backend-api",
"status": "live"
}'
\`\`\`

#### 2. GitHub Webhook

Point your GitHub repository webhook settings to:

\`\`\`
https://your-pinga-instance.com/api/webhook/github
\`\`\`

(Ensure you have installed the Pinga GitHub App or provided your User ID if using manual webhooks).

## Telegram Webhook

Used by Telegram to send updates to Pinga.

\`\`\`
POST /api/webhook/telegram
\`\`\`

- **Authentication**: Validates request via Telegram Bot Token logic (implicit).
- **Features**: Handles text, voice messages, and `my_chat_member` updates.

## Slack Webhook

Used by Slack's Event Subscription API.

\`\`\`
POST /api/webhook/slack
\`\`\`

- **Authentication**: Verifies requests using `SLACK_SIGNING_SECRET`.
- **Features**: Handles `url_verification`, `event_callback` (messages, app mentions).
