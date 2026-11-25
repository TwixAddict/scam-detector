// Static reference data used by the detector: brands, risky hosts, file types.
(function (SD) {
  "use strict";

  // Brand name -> the domains it really sends mail and links from.
  // `names` are matched as whole words; `caseSensitive` names only match in that exact case
  // (so "UPS" doesn't fire on "ups and downs").
  SD.BRANDS = [
    { brand: "PayPal", names: ["paypal"], domains: ["paypal.com", "paypal.me", "paypal.be", "paypal.nl", "paypal.de", "paypal.fr", "paypalobjects.com", "paypal-communication.com"] },
    { brand: "Apple", names: ["apple", "icloud", "itunes", "app store", "apple id"], domains: ["apple.com", "icloud.com", "me.com", "itunes.com", "mzstatic.com", "apple.news"] },
    { brand: "Microsoft", names: ["microsoft", "office 365", "office365", "microsoft 365", "onedrive", "sharepoint", "outlook", "windows defender", "xbox", "skype"], caseSensitiveNames: ["Microsoft Teams"], domains: ["microsoft.com", "microsoftonline.com", "office.com", "office365.com", "office.net", "live.com", "outlook.com", "sharepoint.com", "onedrive.com", "1drv.ms", "xbox.com", "skype.com", "windows.com", "msn.com", "azure.com", "bing.com", "microsoftstoreemail.com"] },
    { brand: "Google", names: ["google", "gmail", "google drive", "google workspace", "youtube"], domains: ["google.com", "gmail.com", "googlemail.com", "youtube.com", "gstatic.com", "googleusercontent.com", "googleapis.com", "googlegroups.com", "google.be", "google.nl", "google.de", "google.fr", "withgoogle.com"] },
    { brand: "Amazon", names: ["amazon", "amazon prime", "prime video", "aws"], caseSensitiveNames: ["AWS"], domains: ["amazon.com", "amazon.de", "amazon.fr", "amazon.nl", "amazon.com.be", "amazon.co.uk", "amazon.it", "amazon.es", "amazon.ca", "amazon.pl", "amazon.se", "amazonaws.com", "amazonses.com", "media-amazon.com", "ssl-images-amazon.com", "primevideo.com", "aws.com"] },
    { brand: "Netflix", names: ["netflix"], domains: ["netflix.com", "nflxext.com", "nflximg.net", "nflxso.net"] },
    { brand: "Facebook", names: ["facebook", "meta for business", "instagram", "whatsapp"], domains: ["facebook.com", "facebookmail.com", "fb.com", "meta.com", "instagram.com", "whatsapp.com", "fbcdn.net", "metamail.com"] },
    { brand: "LinkedIn", names: ["linkedin"], domains: ["linkedin.com", "licdn.com", "lnkd.in"] },
    { brand: "DHL", names: ["dhl"], domains: ["dhl.com", "dhl.de", "dhl.be", "dhl.nl", "dhl.fr", "dhlparcel.nl", "dhlparcel.be", "dhl.co.uk", "dpdhl.com"] },
    { brand: "bpost", names: ["bpost"], domains: ["bpost.be", "bpost.cloud"] },
    { brand: "PostNL", names: ["postnl"], domains: ["postnl.nl", "postnl.be", "postnl.com"] },
    { brand: "UPS", names: [], caseSensitiveNames: ["UPS"], domains: ["ups.com"] },
    { brand: "FedEx", names: ["fedex"], domains: ["fedex.com"] },
    { brand: "DPD", names: [], caseSensitiveNames: ["DPD"], domains: ["dpd.com", "dpd.be", "dpd.nl", "dpd.de", "dpd.fr", "dpd.co.uk"] },
    { brand: "GLS", names: [], caseSensitiveNames: ["GLS"], domains: ["gls-group.eu", "gls-group.com", "gls-info.nl", "gls-pakete.de"] },
    { brand: "USPS", names: ["usps"], domains: ["usps.com", "usps.gov"] },
    { brand: "Royal Mail", names: ["royal mail"], domains: ["royalmail.com", "royalmail.co.uk"] },
    { brand: "itsme", names: ["itsme"], domains: ["itsme-id.com", "itsme.be"] },
    { brand: "FOD Financiën / SPF Finances", names: ["spf finances", "fod financiën", "fod financien", "myminfin", "tax-on-web", "belgian tax"], domains: ["belgium.be", "fgov.be", "myminfin.be", "fin.belgium.be"] },
    { brand: "Belfius", names: ["belfius"], domains: ["belfius.be", "belfius.com"] },
    { brand: "KBC", names: [], caseSensitiveNames: ["KBC"], domains: ["kbc.be", "kbc.com", "cbc.be"] },
    { brand: "ING", names: [], caseSensitiveNames: ["ING"], domains: ["ing.be", "ing.nl", "ing.com", "ing.de", "ing.fr"] },
    { brand: "BNP Paribas Fortis", names: ["bnp paribas", "bnp", "fortis"], domains: ["bnpparibasfortis.be", "bnpparibas.com", "bnpparibas.be", "bnpparibas.fr", "hellobank.be"] },
    { brand: "Argenta", names: ["argenta"], domains: ["argenta.be"] },
    { brand: "Rabobank", names: ["rabobank"], domains: ["rabobank.nl", "rabobank.com"] },
    { brand: "ABN AMRO", names: ["abn amro"], domains: ["abnamro.nl", "abnamro.com"] },
    { brand: "Adobe", names: ["adobe"], domains: ["adobe.com", "adobesign.com", "echosign.com"] },
    { brand: "Dropbox", names: ["dropbox"], domains: ["dropbox.com", "dropboxmail.com"] },
    { brand: "DocuSign", names: ["docusign"], domains: ["docusign.com", "docusign.net"] },
    { brand: "Norton", names: ["norton", "nortonlifelock"], domains: ["norton.com", "nortonlifelock.com", "gen.digital"] },
    { brand: "McAfee", names: ["mcafee"], domains: ["mcafee.com"] },
    { brand: "Geek Squad", names: ["geek squad", "best buy"], domains: ["geeksquad.com", "bestbuy.com"] },
    { brand: "Coinbase", names: ["coinbase"], domains: ["coinbase.com"] },
    { brand: "Binance", names: ["binance"], domains: ["binance.com"] },
    { brand: "Bank of America", names: ["bank of america"], domains: ["bankofamerica.com", "bofa.com"] },
    { brand: "Chase", names: ["chase bank", "jpmorgan chase", "jp morgan"], domains: ["chase.com", "jpmorgan.com", "jpmorganchase.com"] },
    { brand: "Wells Fargo", names: ["wells fargo"], domains: ["wellsfargo.com"] },
    { brand: "eBay", names: ["ebay"], domains: ["ebay.com", "ebay.de", "ebay.fr", "ebay.nl", "ebay.be", "ebay.co.uk", "ebaystatic.com"] },
    { brand: "Steam", names: ["steam support", "steam community", "steampowered"], domains: ["steampowered.com", "steamcommunity.com", "steamstatic.com"] },
    { brand: "Spotify", names: ["spotify"], domains: ["spotify.com", "scdn.co"] },
    { brand: "Booking.com", names: ["booking.com"], domains: ["booking.com", "bstatic.com"] },
    { brand: "Airbnb", names: ["airbnb"], domains: ["airbnb.com", "airbnb.be", "airbnb.nl", "muscache.com"] },
    { brand: "Mastercard", names: ["mastercard"], domains: ["mastercard.com", "mastercard.be"] },
    { brand: "Visa", names: [], caseSensitiveNames: ["VISA", "Visa Card", "Visa Secure"], domains: ["visa.com", "visa.be"] },
    { brand: "American Express", names: ["american express", "amex"], domains: ["americanexpress.com", "aexp.com", "aexp-static.com"] },
    { brand: "Revolut", names: ["revolut"], domains: ["revolut.com", "revolut.me"] },
    { brand: "Zalando", names: ["zalando"], domains: ["zalando.be", "zalando.nl", "zalando.de", "zalando.fr", "zalando.com", "ztat.net"] },
    { brand: "bol.com", names: ["bol.com"], domains: ["bol.com"] },
    { brand: "Coolblue", names: ["coolblue"], domains: ["coolblue.be", "coolblue.nl", "coolblue.de"] },
    { brand: "Proximus", names: ["proximus"], domains: ["proximus.be", "proximus.com"] },
    { brand: "Telenet", names: ["telenet"], domains: ["telenet.be"] },
    { brand: "Vodafone", names: ["vodafone"], domains: ["vodafone.com", "vodafone.de", "vodafone.nl", "vodafone.co.uk"] },
    { brand: "IRS", names: ["internal revenue service"], caseSensitiveNames: ["IRS"], domains: ["irs.gov"] },
    { brand: "HMRC", names: ["hmrc"], domains: ["hmrc.gov.uk", "gov.uk"] },
  ];

  // Rich people whose names donation and investment scams borrow.
  SD.FAMOUS_NAMES = [
    "Warren Buffett", "Bill Gates", "Melinda Gates", "MacKenzie Scott", "Elon Musk", "Jeff Bezos",
    "Mark Zuckerberg", "Oprah Winfrey", "Richard Branson", "Azim Premji", "Larry Ellison", "Bernard Arnault",
    "Mike Hayes", "Mavis Wanczyk", "Manuel Franco", "Gloria Mackenzie", "Frances Connolly", "Patrick Connolly",
  ];

  // Well-known services that aren't in SD.BRANDS. Mail from these domains (and from every brand
  // domain above) is treated as a known company: wording isn't flagged, links and files still are.
  SD.TRUSTED_SENDER_DOMAINS = [
    "github.com", "gitlab.com", "slack.com", "zoom.us", "discord.com", "discordapp.com", "twitch.tv", "reddit.com",
    "redditmail.com", "x.com", "twitter.com", "tiktok.com", "pinterest.com", "snapchat.com", "duolingo.com",
    "canva.com", "notion.so", "figma.com", "atlassian.com", "stripe.com", "shopify.com", "wise.com", "n26.com",
    "bunq.com", "vinted.be", "vinted.com", "vinted.nl", "vinted.fr", "2dehands.be", "2ememain.be", "marktplaats.nl",
    "smartschool.be", "itsme-id.com", "mollie.com", "payconiq.be", "payconiq.com", "nmbs.be", "sncb.be", "belgiantrain.be",
    "delijn.be", "stib.be", "deliveroo.be", "ubereats.com", "uber.com", "takeaway.com", "thuisbezorgd.nl",
    "ikea.com", "decathlon.be", "mediamarkt.be", "krefel.be", "vanden-borre.be", "fnac.be", "aliexpress.com",
    "temu.com", "shein.com", "etsy.com", "kickstarter.com", "patreon.com", "openai.com", "anthropic.com",
    "flixbus.com", "flixbus.be", "flixbus.de", "flixbus.nl", "flixbus.fr", "flix.com", "ryanair.com", "brusselsairlines.com",
    "sncf-connect.com", "eurostar.com", "booking.com", "airbnb.com",
    "mozilla.org", "mozilla.com", "proton.me", "protonmail.com", "nintendo.com", "playstation.com", "epicgames.com",
    "ea.com", "ubisoft.com", "riotgames.com", "blizzard.com", "roblox.com", "minecraft.net", "mojang.com",
  ];

  SD.FREEMAIL_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "outlook.com", "outlook.be", "outlook.fr", "outlook.de", "outlook.nl",
    "hotmail.com", "hotmail.be", "hotmail.fr", "hotmail.de", "hotmail.nl", "hotmail.co.uk", "live.com",
    "live.be", "live.nl", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "yahoo.de", "yahoo.co.uk",
    "ymail.com", "aol.com", "icloud.com", "me.com", "mac.com", "protonmail.com", "proton.me", "pm.me",
    "gmx.com", "gmx.de", "gmx.net", "web.de", "mail.com", "yandex.ru", "yandex.com", "mail.ru",
    "zoho.com", "tutanota.com", "tuta.io", "skynet.be", "telenet.be", "laposte.net", "orange.fr",
    "free.fr", "sfr.fr", "libero.it", "qq.com", "163.com", "126.com", "outlook.sa",
  ]);

  SD.SHORTENERS = new Set([
    "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly",
    "shorturl.at", "rb.gy", "t.ly", "tiny.cc", "bl.ink", "s.id", "v.gd", "qrco.de", "surl.li",
    "urlz.fr", "x.co", "adf.ly", "bit.do", "soo.gd", "clck.ru", "u.to", "tr.im", "shorturl.me",
    "short.gy", "rotf.lol", "tiny.one", "shrtco.de", "is.gd", "lnkd.in", "1url.com", "t.me",
  ]);

  // Cheap TLDs that phishers love. Light weight only: plenty of legitimate sites use them.
  SD.SUSPICIOUS_TLDS = new Set([
    "xyz", "top", "icu", "zip", "mov", "click", "link", "work", "rest", "buzz", "cfd", "sbs", "cyou",
    "monster", "quest", "gq", "tk", "ml", "cf", "ga", "cam", "bar", "beauty", "hair", "mom", "autos",
    "boats", "online", "site", "website", "space", "fun", "loan", "win", "bid", "kim", "men", "date",
    "review", "stream", "download", "racing", "party", "accountant", "science", "cricket", "faith",
    "lol", "country", "support", "su", "pw", "cc", "info",
  ]);

  // Free web hosting, site builders and form builders: anyone can put a login page here.
  SD.FREE_HOSTING = [
    "forms.gle", "sites.google.com", "docs.google.com/forms", "firebaseapp.com", "web.app",
    "netlify.app", "vercel.app", "weebly.com", "weeblysite.com", "wixsite.com", "square.site",
    "glitch.me", "github.io", "pages.dev", "workers.dev", "ipfs.io", "dweb.link", "cloudflare-ipfs.com",
    "pinata.cloud", "000webhostapp.com", "blogspot.com", "herokuapp.com", "repl.co", "replit.app",
    "typeform.com", "jotform.com", "webflow.io", "framer.app", "godaddysites.com", "mystrikingly.com",
    "carrd.co", "notion.site", "my.canva.site", "r2.dev", "storage.googleapis.com", "azurewebsites.net",
    "blob.core.windows.net", "web.core.windows.net", "surge.sh", "onrender.com", "fly.dev",
    "forms.office.com", "formsubmit.co", "wufoo.com", "formstack.com", "zohopublic.com",
  ];

  // File sharing that is fine on its own, but a classic lure when paired with "sign in to view".
  SD.SHARED_DOCUMENT_HOSTS = [
    "sharepoint.com", "onedrive.live.com", "1drv.ms", "docs.google.com", "drive.google.com",
    "dropbox.com", "box.com", "wetransfer.com",
  ];

  // Email service providers / click trackers: links through these hide the real destination,
  // but legitimate newsletters use them all the time.
  SD.CLICK_TRACKERS = [
    "list-manage.com", "mailchimp.com", "mcusercontent.com", "sendgrid.net", "sendgrid.com",
    "mandrillapp.com", "mailgun.org", "hubspotlinks.com", "hs-sites.com", "hubspot.com",
    "exacttarget.com", "rs6.net", "mktoweb.com", "mkt.com", "klclick.com", "klclick1.com",
    "klaviyo.com", "ct.sendgrid.net", "sparkpostmail.com", "cmail19.com", "cmail20.com",
    "createsend.com", "awstrack.me", "mlsend.com", "brevo.com", "sendibt2.com", "sendibt3.com",
    "sendinblue.com", "mjt.lu", "acemlnb.com", "activehosted.com", "substack.com", "beehiiv.com",
    "convertkit-mail.com", "ck.page", "emltrk.com", "salesforce.com", "pardot.com",
    // "Get our app" links: mobile attribution trackers that forward to the app store or the sender's site
    "adjust.com", "adj.st", "app.link", "bnc.lt", "branch.io", "onelink.me", "appsflyer.com", "page.link", "smart.link",
  ];

  // Hosts that appear in threat feeds but are shared by millions of users;
  // only exact-URL matches count for these, never host-only matches.
  SD.SHARED_PLATFORM_HOSTS = new Set([
    "github.com", "raw.githubusercontent.com", "gist.githubusercontent.com", "docs.google.com",
    "drive.google.com", "sites.google.com", "storage.googleapis.com", "dropbox.com", "www.dropbox.com",
    "dl.dropboxusercontent.com", "onedrive.live.com", "1drv.ms", "cdn.discordapp.com", "bitbucket.org",
    "gitlab.com", "pastebin.com", "t.me", "bit.ly", "tinyurl.com", "forms.gle", "www.google.com",
    "google.com", "youtube.com", "www.youtube.com", "facebook.com", "www.facebook.com",
    "linkedin.com", "www.linkedin.com", "twitter.com", "x.com", "archive.org", "web.archive.org",
  ]);

  SD.DANGEROUS_EXTENSIONS = new Set([
    "exe", "scr", "js", "jse", "vbs", "vbe", "hta", "iso", "img", "lnk", "msi", "bat", "cmd", "ps1",
    "com", "pif", "jar", "wsf", "wsh", "cpl", "reg", "vhd", "vhdx", "appx", "msix", "apk", "dll",
    "scf", "chm", "application", "gadget", "msc", "url", "xll", "one",
  ]);
  SD.HTML_EXTENSIONS = new Set(["html", "htm", "shtml", "xhtml", "svg", "mht", "mhtml", "xht"]);
  SD.MACRO_EXTENSIONS = new Set(["docm", "xlsm", "pptm", "dotm", "xltm", "xlam", "ppam", "potm", "xlsb"]);
  SD.ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "gz", "tgz", "tar", "cab", "ace", "arj", "z", "bz2", "xz"]);
  SD.DOCUMENT_EXTENSIONS = new Set([
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "txt", "rtf", "csv", "jpg",
    "jpeg", "png", "gif", "mp3", "wav", "mp4", "eml", "msg",
  ]);

  // Multi-label public suffixes (a small slice of the Public Suffix List), including the
  // "private" platform suffixes so that `paypal-login.web.app` counts as its own site.
  SD.MULTI_PART_SUFFIXES = new Set([
    "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk", "com.au", "net.au",
    "org.au", "gov.au", "edu.au", "co.nz", "co.jp", "ne.jp", "or.jp", "com.br", "com.mx", "com.ar",
    "com.tr", "com.cn", "net.cn", "org.cn", "com.hk", "com.sg", "com.my", "co.in", "co.za", "co.kr",
    "com.tw", "co.il", "com.be", "com.pl", "com.ua", "com.ru", "co.id", "com.ng", "com.pk", "com.vn",
    "com.co", "com.pe", "com.ph", "co.th",
    "github.io", "netlify.app", "web.app", "firebaseapp.com", "herokuapp.com", "vercel.app",
    "pages.dev", "workers.dev", "blogspot.com", "wixsite.com", "weebly.com", "weeblysite.com",
    "glitch.me", "repl.co", "replit.app", "webflow.io", "framer.app", "godaddysites.com",
    "mystrikingly.com", "notion.site", "azurewebsites.net", "blob.core.windows.net",
    "web.core.windows.net", "000webhostapp.com", "r2.dev", "surge.sh", "onrender.com", "fly.dev",
    "square.site", "carrd.co", "my.canva.site", "ngrok.io", "ngrok-free.app", "trycloudflare.com",
  ]);

  // A slice of Unicode TR39 confusables: characters that render like Latin letters.
  SD.CONFUSABLES = {
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j",
    "ѕ": "s", "ԁ": "d", "ɡ": "g", "ӏ": "l", "һ": "h", "ո": "n", "ս": "u", "ԛ": "q", "ԝ": "w",
    "к": "k", "м": "m", "н": "h", "т": "t", "в": "b", "ь": "b", "ӧ": "o", "ё": "e",
    "ο": "o", "α": "a", "ν": "v", "ρ": "p", "ι": "i", "κ": "k", "τ": "t", "υ": "u", "χ": "x",
    "ε": "e", "β": "b", "γ": "y", "η": "n", "ω": "w",
    "ı": "i", "ł": "l", "ɩ": "i", "ʟ": "l", "ꞁ": "l", "ǀ": "l", "ɑ": "a", "ɒ": "a", "ɛ": "e",
    "à": "a", "á": "a", "â": "a", "ä": "a", "ã": "a", "å": "a", "è": "e", "é": "e", "ê": "e",
    "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i", "ò": "o", "ó": "o", "ô": "o", "ö": "o",
    "õ": "o", "ù": "u", "ú": "u", "û": "u", "ü": "u", "ç": "c", "ñ": "n", "ý": "y", "ÿ": "y",
    "0": "o", "1": "l", "3": "e", "5": "s", "|": "l", "!": "i",
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
