// Phrase patterns for the content signals, in English, French, Dutch and German.
// Each pattern is tested against lower-cased text with invisible characters removed.
(function (SD) {
  "use strict";

  const p = (source) => new RegExp(source, "iu");
  const line = (source) => new RegExp(source, "imu"); // ^ matches at every line start

  SD.PHRASES = {
    urgency: [
      p("within (24|48|72|12|\\d+) ?(hours|hrs|h|days)"), p("account (has been |will be |is )?(suspended|locked|disabled|limited|restricted|deactivated|closed|terminated|on hold)"),
      p("final (notice|warning|reminder)"), p("last (warning|chance|reminder)"), p("legal action"),
      p("unauthori[sz]ed (login|access|sign-?in|activity|transaction|purchase)"), p("immediate(ly)? (action|attention)"),
      p("act now"), p("urgent(ly)?\\b"), p("expires? (today|soon|in \\d+)"), p("suspicious (activity|login|sign-?in)"),
      p("failure to (comply|respond|verify|update)"), p("permanently (deleted|closed|suspended|disabled)"),
      p("unusual (sign-?in|activity|login)"), p("will be (deleted|blocked|suspended|closed)"),
      p("dans les (24|48) ?h"), p("compte (a été |sera |est )?(suspendu|bloqué|désactivé|restreint|limité)"),
      p("dernier (avis|rappel|avertissement)"), p("action (immédiate|requise)"), p("poursuites judiciaires"),
      p("connexion inhabituelle"), p("activité suspecte"),
      p("binnen (24|48) uur"), p("(account|rekening) (is |wordt )?(geblokkeerd|opgeschort|gedeactiveerd|beperkt)"),
      p("laatste (waarschuwing|herinnering|aanmaning)"), p("juridische stappen"), p("dringend"),
      p("verdachte (activiteit|aanmelding)"), p("ongebruikelijke aanmelding"),
      p("innerhalb von (24|48) stunden"), p("konto (wurde |wird )?(gesperrt|eingeschränkt|deaktiviert)"),
      p("letzte mahnung"), p("rechtliche schritte"), p("verdächtige aktivität"), p("ungewöhnliche anmeldung"),
    ],
    credentials: [
      p("verify your (account|identity|password|information|details|email|mailbox)"),
      p("confirm your (account|identity|password|card|billing|payment|details|information|login)"),
      p("update (your )?(billing|payment|account|card) (information|details|method|info)"),
      p("(enter|provide|re-?enter|submit) your (password|pin|login|credentials|card|bank)"),
      p("validate your (account|mailbox|email)"), p("mailbox (is )?(full|over quota|storage)"),
      p("your password (will )?(expire|has expired)"), p("sign in to (verify|confirm|restore|unlock|view|reactivate)"),
      p("(card|credit card) (details|number|information)"), p("social security number"), p("\\bcvv\\b"),
      p("login credentials"), p("restore (your )?(account )?access"), p("reactivate your account"),
      p("vérifie[rz] (votre|vos) (compte|identité|informations|coordonnées)"),
      p("confirme[rz] (votre|vos) (compte|identité|informations|coordonnées)"),
      p("mettre à jour (vos|votre) (informations|coordonnées|moyen de paiement)"),
      p("(saisir|entrer|entrez) votre mot de passe"), p("données bancaires"), p("carte bancaire"),
      p("(bevestig|verifieer|controleer) (uw|je) (gegevens|identiteit|account|rekening)"),
      p("(uw|je) (bank)?gegevens (bij )?(te )?werken"), p("wachtwoord (invoeren|bevestigen)"),
      p("kaartgegevens"), p("pincode"),
      p("bestätigen sie ihre (daten|identität|kontodaten|zahlungsdaten)"), p("verifizieren sie ihr"),
      p("aktualisieren sie ihre (zahlungs|konto)"), p("passwort (eingeben|bestätigen)"),
      p("(kreditkarten|karten)daten"),
    ],
    payment: [
      p("gift ?cards?"), p("(itunes|google play|steam|amazon|apple) (gift )?cards?"), p("\\bbitcoin\\b"),
      p("\\bbtc\\b"), p("crypto ?(currency|wallet)"), p("\\busdt\\b"), p("wallet address"),
      p("wire transfer"), p("western union"), p("moneygram"),
      p("(change|update|new|updated) (of |in |to )?(our |my )?bank(ing)? (details|account|information)"),
      p("new (iban|account number)"), p("changed (our|my) bank"),
      p("(chèques?|cartes?) cadeaux?"), p("cadeaukaart(en)?"), p("geschenkkarten?"),
      p("nouvel? (iban|rib)"), p("nieuw rekeningnummer"), p("neue bankverbindung"),
    ],
    genericGreeting: [
      line("^\\s*(dear|hello|hi) (customer|user|client|member|account holder|valued customer|sir/madam|sir or madam|beneficiary|friend|account owner)"),
      p("\\bdear (valued )?(customer|user|client|member|account holder)\\b"),
      p("(cher|chère) (client|cliente|utilisateur|membre)"), p("(beste|geachte) (klant|gebruiker|cliënt)"),
      p("(sehr geehrter|lieber|liebe) (kunde|kundin|nutzer)"),
    ],
    tooGood: [
      p("you('ve| have)? (won|been selected)"), p("\\blottery\\b"), p("\\bjackpot\\b"),
      p("claim your (reward|prize|refund|winnings|gift)"), p("\\binheritance\\b"),
      p("unclaimed (funds|package|parcel|money)"), p("\\bbeneficiary\\b"),
      p("compensation (fund|payment)"), p("selected (for|to receive)"), p("earn \\$?€?\\d+ (per|a) (day|week|hour)"),
      p("work from home"), p("free (iphone|gift|money)"), p("vous avez (gagné|été sélectionné)"),
      p("héritage"), p("u (heeft|hebt) gewonnen"), p("erfenis"), p("sie haben gewonnen"), p("erbschaft"),
    ],
    // "Money is waiting for you" (advance-fee / 419 scams).
    advanceFee: [
      p("(was|were|has been|have been) (donated|awarded|allocated|granted|willed|bequeathed) to you"), p("donat(ed|ion) to you"),
      p("(claim|receive|collect|release) (the|your|this) (money|funds?|donation|payment|compensation|prize|grant|inheritance)"),
      p("selected \\(?e-?mail\\)?"), p("your e-?mail (address )?(was|has been) (selected|chosen|picked)"),
      p("you (were|have been) (chosen|picked) (to|as|for)"), p("next of kin"), p("transfer (the|this|these) (funds?|money)"),
      p("charity (donation|grant)"), p("(philanthrop|humanitarian) (donation|grant|project)"),
      p("vous (avez|a) été (choisi|sélectionné)"), p("(don|somme) (vous a été|de) (attribué|versé)"),
      p("u (bent|werd) (gekozen|geselecteerd)"), p("schenking"), p("sie wurden ausgewählt"), p("spende (an|für) sie"),
    ],
    // Scammers who first just want an answer, to confirm the address is read.
    replyBait: [
      p("confirm (that )?(this|your) (e-?mail|address|\\(e-?mail\\)) (address )?is (valid|active|correct|working)"),
      p("(is|if) (this )?(your )?(selected )?\\(?e-?mail\\)? (address )?is (still )?(valid|active)"),
      p("reply (to me )?(to|if|with|for) .{0,40}(valid|confirm|details|information|claim)"),
    ],
    gambling: [
      p("\\bcasino'?s?\\b"), p("(free|gratis|bonus) ?spins?"), p("tours? (gratuits?|offerts?)"), p("freispiele"),
      p("welco?me ?(bonus|pack(age)?)"), p("welkomst(bonus|pakket)"), p("bonus de bienvenue"), p("willkommens(bonus|paket)"),
      p("no deposit"), p("sans dépôt"), p("zonder storting"), p("ohne einzahlung"), p("eerste storting"), p("premier dépôt"),
      p("first deposit"), p("\\broulette\\b"), p("\\bslots?\\b"), p("\\bgokken\\b"), p("paris sportifs"),
      p("sports? ?betting"), p("(je|uw|your|votre|ihr) (exclusieve |exclusive |exclusif |exklusiver )?bonus"),
      p("bonus (wacht|awaits|vous attend|wartet)"), p("\\bvip (casino|club|bonus|status)"),
    ],
    // Pirate TV subscriptions ("IPTV"): illegal streams, paid up front, often never delivered.
    iptv: [
      p("\\biptv\\b"), p("[0-9][0-9.,]*\\+? ?(live )?(tv )?(channels|chaînes|zenders|kanäle|sender)"),
      p("[0-9][0-9.,]*\\+? ?(movies|films|vod)"), p("movies (&|and) series"), p("films? (et|en|und) s[ée]ries?"),
      p("fire ?stick"), p("firestick"), p("smart tv,"), p("\\b(4k|uhd|full hd)\\b.{0,20}(quality|qualité|kwaliteit|qualität)"),
      p("live sports?"), p("international channels"), p("premium entertainment"), p("\\bm3u\\b"), p("anti-?freeze"),
      p("[0-9]+ months? \\+ [0-9]+ months? free"), p("[0-9]+ maanden \\+ [0-9]+ (maand|maanden) gratis"),
    ],
    hardSell: [
      p("(your )?exclusive (offer|deal|discount)"), p("claim (your|this|the) (offer|deal|discount|spot)"),
      p("\\bonly (eur|€|\\$|usd|£) ?[0-9]+"), p("one(-| )time payment"), p("one payment"), p("limited (time|offer|spots)"),
      p("(order|buy|act) now"), p("ready to get started\\?"), p("don'?t miss (out|this)"), p("lowest price"),
      p("exclusieve (aanbieding|deal)"), p("offre exclusive"), p("exklusives angebot"), p("profiteer (nu|snel)"),
    ],
    chatApp: [
      p("\\b(whats ?app|telegram|signal|viber|wechat)\\b\\s*[:\\-]?\\s*\\+?[0-9][0-9 ().-]{7,}"),
      p("(contact|message|text|write|reach|add) (us|me) (on|via|through) (whats ?app|telegram|signal|viber)"),
      p("(stuur|contacteer) (ons|me) (een bericht )?(via|op) (whats ?app|telegram)"),
      p("(contactez|écrivez)[- ](nous|moi) (sur|via) (whats ?app|telegram)"),
    ],
    refund: [
      p("(tax )?refund (is )?(available|pending|approved)"), p("eligible (for|to receive) a refund"),
      p("remboursement (d'impôt|disponible|en attente)"), p("belastingteruggave"), p("teruggave"),
      p("steuerrückerstattung"), p("rückerstattung"), p("you are due a refund"),
    ],
    secrecy: [
      p("keep (this|it) (confidential|between us|private|quiet)"), p("(don'?t|do not) (tell|mention|discuss|share this)"),
      p("i('m| am) (in a meeting|in meetings|travell?ing|busy)"), p("can'?t (talk|take calls)"),
      p("(reply|respond) (only )?(by|via) (e-?mail|text)"), p("are you available\\??"), p("\\bdiscreet(ly)?\\b"),
      p("(gardez|garder) (cela|ceci) (confidentiel|pour vous)"), p("je suis en réunion"),
      p("(hou|houd) dit (vertrouwelijk|onder ons)"), p("ik zit in een vergadering"),
      p("(behalten sie|bitte) (das|dies) (vertraulich|für sich)"), p("ich bin in einem meeting"),
    ],
    fakeBanner: [
      p("(this )?(e-?mail|message) (has been|was|is) (scanned|verified|checked)"), p("verified (safe|secure) by"),
      p("no (virus|viruses|threats|malware) (found|detected)"), p("secured by (microsoft|norton|mcafee|outlook|office ?365|avast|google)"),
      p("this is a (secure|verified|trusted) (message|email)"), p("\\bsafe sender\\b"),
      p("(scanned|protected) by (norton|mcafee|avast|symantec|microsoft defender)"),
    ],
    delivery: [
      p("(customs|import|delivery|shipping|redelivery|clearance) (fee|charge|duty|duties|costs?)"),
      p("(parcel|package|shipment) (is |has been )?(on hold|held|waiting|pending|could not be delivered|returned)"),
      p("failed delivery( attempt)?"), p("unable to deliver"), p("reschedule (your )?delivery"),
      p("(pay|payment of) (a )?(small )?(fee|€|eur|\\$)"),
      p("frais de (douane|livraison|dédouanement)"), p("colis (est )?(en attente|bloqué|retenu)"),
      p("livraison (échouée|impossible)"), p("douanekosten"), p("inklaringskosten"),
      p("pakket(je)? (staat )?(in de wacht|kon niet worden (bezorgd|geleverd)|vastgehouden)"),
      p("bezorgpoging"), p("zollgebühr(en)?"), p("paket (konnte nicht zugestellt|wird zurückgehalten)"),
      p("zustellversuch"),
    ],
    government: [
      p("\\bhmrc\\b"), p("internal revenue service"), p("spf finances"), p("fod financi[eë]n"),
      p("myminfin"), p("tax-on-web"), p("\\bitsme\\b"), p("belastingdienst"), p("finanzamt"),
      p("impots\\.gouv"), p("(tax|vat) (return|refund|assessment)"),
    ],
    sextortion: [
      p("i (have )?hacked"), p("(hacked|access to|control of) your (device|computer|webcam|camera|account|phone)"),
      p("recorded you"), p("(adult|porn|xxx) (site|website|videos?|content)"), p("masturbat"),
      p("i will (send|share|release|forward) (the |this |that )?(video|recording|footage)"),
      p("(all )?your contacts"), p("(bitcoin|btc) (address|wallet)"), p("your password is"),
      p("i know your password"), p("j'ai piraté"), p("ik heb (je|uw) (computer|apparaat) gehackt"),
      p("ich habe (ihr|dein) (gerät|computer) gehackt"),
    ],
    invoice: [
      p("\\binvoice\\b"), p("\\border (number|#|no\\.?)"), p("subscription"), p("auto-?renew(al|ed)?"),
      p("(has been|was|will be) charged"), p("transaction (id|number)"), p("renewal"), p("\\bfactuur\\b"),
      p("\\bfacture\\b"), p("\\brechnung\\b"), p("abonnement"),
    ],
    callAction: [
      p("call (us|our|the|immediately|now|toll[- ]free|this number|support)"), p("(contact|reach) (us|our support) (at|on)"),
      p("to cancel"), p("helpline"), p("(toll[- ]free|hotline)"), p("appelez"), p("bel (ons|naar)"), p("rufen sie"),
    ],
    bec: [
      p("(change|changes|update|updating) (of |to |in )?(my |our )?(payroll|direct deposit|salary account)"),
      p("urgent (wire|payment|transfer|invoice)"), p("process (a|an|the) (payment|wire|transfer)"),
      p("pay (this|the) invoice (today|urgently|asap|now)"), p("(buy|purchase|get) (some |a few )?gift ?cards"),
      p("for a client"), p("changement de (coordonnées bancaires|rib)"), p("wijziging (van )?(rekeningnummer|bankgegevens)"),
      p("änderung (der )?bankverbindung"),
    ],
    sharedDocumentLure: [
      p("(shared|sent) (a |an )?(document|file|folder|pdf)"), p("(view|open|access|review) (the )?(document|file|pdf|invoice|message)"),
      p("sign in to (view|access|download)"), p("secure (document|file|message)"), p("encrypted (message|document)"),
    ],
    qr: [p("scan (the|this) (qr )?code"), p("qr[- ]code"), p("scannez le (qr )?code"), p("scan de (qr-)?code"), p("scannen sie den")],
    loginWords: [
      p("\\b(log ?in|sign ?in|logon|verify|confirm|update|unlock|restore|validate|secure|reactivate|access|view|pay|review)\\b"),
      p("\\b(connexion|connecter|vérifier|confirmer|inloggen|aanmelden|bevestigen|anmelden|bestätigen)\\b"),
    ],
    archivePassword: [
      p("password( is)?\\s*[:=]?\\s*\\S{3,}"), p("mot de passe\\s*[:=]?\\s*\\S{3,}"),
      p("wachtwoord\\s*[:=]?\\s*\\S{3,}"), p("passwort\\s*[:=]?\\s*\\S{3,}"), p("\\bpwd?\\s*[:=]\\s*\\S{3,}"),
    ],
    quoteMarkers: [
      line("^on .{3,80} wrote:"), p("-----\\s*original message\\s*-----"), line("^from: .+\\n.*(sent|date): "),
      line("^le .{3,80} a écrit"), line("^op .{3,80} schreef"), line("^am .{3,80} schrieb"),
    ],
    orgWords: [
      p("\\b(bank|support|security|team|department|billing|services?|help ?desk|payroll|admin(istrator)?|accounts?|customer (care|service)|invoices?|finance|no-?reply|notifications?|verification|compliance|office|helpdesk|webmaster|it[- ]support|postmaster|mail ?delivery|delivery|tax|government|ministry|police)\\b"),
      new RegExp("\\b(IT|HR)\\b", "u"),
    ],
  };

  // Which patterns matched, for showing the user the actual words.
  SD.matchPhrases = function (category, text) {
    const hits = [];
    for (const re of SD.PHRASES[category]) {
      const m = text.match(re);
      if (m) hits.push(m[0].trim());
    }
    return hits;
  };
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
