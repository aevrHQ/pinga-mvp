/**
 * Render Email to Webhook Forwarder
 *
 * Instructions:
 * 1. Go to https://script.google.com/
 * 2. Create a new project
 * 3. Paste this code
 * 4. Update WEBHOOK_URL with your deployed bot URL
 * 5. Set up a trigger:
 *    - Click the clock icon (Triggers)
 *    - Add Trigger
 *    - Function: processRenderEmails
 *    - Event source: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every minute
 */

const WEBHOOK_URL = "https://your-domain.vercel.app/api/webhook/render-mail";

function processRenderEmails() {
  const labelName = "Render-Processed";
  const threads = GmailApp.search("from:no-reply@render.com is:unread");

  // Create label if it doesn't exist
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      if (message.isUnread()) {
        const subject = message.getSubject();
        const body = message.getPlainBody();
        const date = message.getDate();

        // Analyze email content
        const payload = analyzeEmail(subject, body, date);

        // Send webhook
        if (payload) {
          sendWebhook(payload);
        }

        // Mark as read and label
        message.markRead();
      }
    }

    thread.addLabel(label);
  }
}

function analyzeEmail(subject, body, date) {
  let type = "unknown";
  let status = "unknown";
  let serviceName = "unknown";

  // Extract service name from subject (usually "[Service Name] ...")
  const serviceMatch = subject.match(/^\[(.*?)\]/);
  if (serviceMatch) {
    serviceName = serviceMatch[1];
  }

  // Determine event type and status
  if (subject.includes("deploy")) {
    if (subject.includes("failed")) {
      type = "deploy_ended";
      status = "failed";
    } else if (subject.includes("succeeded") || subject.includes("live")) {
      type = "deploy_ended";
      status = "succeeded";
    } else {
      type = "deploy_started";
      status = "pending";
    }
  } else if (subject.includes("build")) {
    if (subject.includes("failed")) {
      type = "build_ended";
      status = "failed";
    } else {
      type = "build_started";
      status = "pending";
    }
  }

  // Extract link if present
  const urlMatch = body.match(/https:\/\/dashboard\.render\.com\/[^\s)]+/);
  const dashboardUrl = urlMatch ? urlMatch[0] : null;

  return {
    source: "render-email",
    subject: subject,
    type: type,
    timestamp: date.toISOString(),
    data: {
      serviceName: serviceName,
      status: status,
      url: dashboardUrl,
    },
  };
}

function sendWebhook(payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };

  try {
    UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Webhook sent for: " + payload.subject);
  } catch (e) {
    Logger.log("Error sending webhook: " + e.toString());
  }
}
