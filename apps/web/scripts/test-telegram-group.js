import https from "https";

// Configuration from your .env.local and issue description
const BOT_TOKEN = "8592021229:AAE2xBbqEg37Q5QRalAv9GQmIznv7eRCM-g";
const GROUP_CHAT_ID = "-5126303421";

function sendMessage(text) {
  const data = JSON.stringify({
    chat_id: GROUP_CHAT_ID,
    text: text,
    parse_mode: "Markdown",
  });

  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = https.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log("Response Body:", body);

      try {
        const json = JSON.parse(body);
        if (json.ok) {
          console.log("✅ SUCCESS: Message sent to group!");
        } else {
          console.error("❌ FAILURE: Telegram API returned error.");
          console.error(`Error Code: ${json.error_code}`);
          console.error(`Description: ${json.description}`);
        }
      } catch {
        console.error("Failed to parse response JSON");
      }
    });
  });

  req.on("error", (error) => {
    console.error("Network Error:", error);
  });

  req.write(data);
  req.end();
}

console.log(`Attempting to send test message to group ${GROUP_CHAT_ID}...`);
sendMessage("*Debug Test:* Checking if bot can post to this group.");
