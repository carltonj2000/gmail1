const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials-gmail-api.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Gmail API.
  authorize(JSON.parse(content), getProfile);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  gmail.users.labels.list(
    {
      userId: "me"
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const labels = res.data.labels;
      if (labels.length) {
        console.log("Labels:");
        labels.forEach(label => {
          console.log(`- ${label.name}`);
        });
      } else {
        console.log("No labels found.");
      }
    }
  );
}

/**
 * Lists the messages in the user's mailbox.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listMessages(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  gmail.users.messages.list(
    {
      userId: "me"
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const messages = res.data.messages;
      if (messages.length) {
        console.log("Messages:");
        messages.forEach(message => {
          console.log(`msg id: ${message.id}, threadId: ${message.threadId}`);
        });
      } else {
        console.log("No Messages found.");
      }
    }
  );
}

async function listMessagesInteractive(auth) {
  let pageToken = null;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "msg> "
  });

  rl.on("line", async line => {
    switch (line.trim()) {
      case "m":
        const res = await listMessages2(auth, pageToken);
        const messages = res.data.messages;
        pageToken = res.data.nextPageToken;
        console.log("Messages length:", messages.length, pageToken);
        console.log(res.data);
        break;
      case "q":
        console.log("Quitting");
        process.exit(0);
        return;
      default:
        console.log(`Expects 'm' or 'q' for more or quit.`);
        break;
    }
    rl.prompt();
  }).on("close", () => {
    console.log("Have a great day!");
    process.exit(0);
  });

  rl.prompt();
}

/**
 * Lists the messages in the user's mailbox.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listMessages2(auth, pageToken = null) {
  return new Promise((resolve, reject) => {
    try {
      const gmail = google.gmail({ version: "v1", auth });
      const opt = { userId: "me" };
      if (pageToken) opt["pageToken"] = pageToken;
      gmail.users.messages.list(opt, (err, res) =>
        err ? reject("The API returned an error: " + err) : resolve(res)
      );
    } catch (error) {
      return reject("err!!!", error);
    }
  });
}
/**
 * Lists the messages in the user's mailbox.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getProfile(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  gmail.users.getProfile({ userId: "me" }, (err, res) => {
    if (err) return console.log("The API returned an error: " + err);
    console.log("result", res.data);
  });
}
