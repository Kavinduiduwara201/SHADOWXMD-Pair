const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  async function RobinPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
      let RobinPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Brave"),
      });

      if (!RobinPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await RobinPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      RobinPairWeb.ev.on("creds.update", saveCreds);
      RobinPairWeb.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
          try {
            await delay(10000);
            const sessionPrabath = fs.readFileSync("./session/creds.json");

            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(RobinPairWeb.user.id);

            function randomMegaId(length = 6, numberLength = 4) {
              const characters =
                "ShadowXMD=KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(
                  Math.floor(Math.random() * characters.length)
                );
              }
              const number = Math.floor(
                Math.random() * Math.pow(10, numberLength)
              );
              return `${result}${number}`;
            }

            const mega_url = await upload(
              fs.createReadStream(auth_path + "creds.json"),
              `${randomMegaId()}.json`
            );

            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              ""
            );

            const sid = `╭━━〔🔗 Pair Code Connected 〕━━╮  
✅ *Your WhatsApp is now linked successfully!*  
🛠️ _Waiting for Shadow XMD Bot to start..._  
💡 *Note:* Bot not connected yet.  
👨‍💻 *Developer:* 𝑲𝒂𝒗𝒊𝒏𝒅𝒖 𝑰𝒅𝒖𝒘𝒂𝒓𝒂  
╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n👉 ${string_session} 👈\n\n*This is the your Session ID, copy this id and paste into config.js file 🤫*\n\n*You can ask any question using this link 👇✒️*\n\n*https://wa.me/+94764040298*\n\n*You can join my whatsapp group*\n\n*https://chat.whatsapp.com/HRRkAxmbg2GGNWPfsX2Nfc?mode=r_t*`;
            const mg = `*🚫⚠️ *Important Notice!* ⚠️🚫

🔐 *Do NOT share this Pair Code with anyone!*  
🤖 It gives full access to your WhatsApp Bot.  
👁️ Keep it private and secure!  
🛡️ Unauthorized use may compromise your account.*`;
            const dt = await RobinPairWeb.sendMessage(user_jid, {
              image: {
                url: "https://sdmntprwestus.oaiusercontent.com/files/00000000-9f18-6230-b033-387d06627328/raw?se=2025-07-15T16%3A13%3A42Z&sp=r&sv=2024-08-04&sr=b&scid=1553a584-ec65-5254-b947-7a2bbd73b5f9&skoid=789f404f-91a9-4b2f-932c-c44965c11d82&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-07-15T15%3A34%3A15Z&ske=2025-07-16T15%3A34%3A15Z&sks=b&skv=2024-08-04&sig=Q4/zInpx0%2BaOL/2tU3oOWhT8Es0bxC6W3dX3ukkM5dw%3D",
              },
              caption: sid,
            });
            const msg = await RobinPairWeb.sendMessage(user_jid, {
              text: string_session,
            });
            const msg1 = await RobinPairWeb.sendMessage(user_jid, { text: mg });
          } catch (e) {
            exec("pm2 restart prabath");
          }

          await delay(100);
          return await removeFile("./session");
          process.exit(0);
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          RobinPair();
        }
      });
    } catch (err) {
      exec("pm2 restart Robin-md");
      console.log("service restarted");
      RobinPair();
      await removeFile("./session");
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await RobinPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart Robin");
});

module.exports = router;
