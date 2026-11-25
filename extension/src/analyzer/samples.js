// Demo emails for the analyzer page and the test suite. All senders and links are made up.
(function (SD) {
  "use strict";

  SD.SAMPLES = [
    {
      id: "paypal",
      label: "Phishing: fake PayPal account warning",
      expect: "danger",
      raw: `Return-Path: <bounce@mailer-kx9.top>
Authentication-Results: mx.google.com;
       dkim=none;
       spf=softfail (google.com: domain of transitioning bounce@mailer-kx9.top does not designate 185.22.1.9 as permitted sender) smtp.mailfrom=bounce@mailer-kx9.top;
       dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=paypa1-secure.co
From: "PayPal Service" <service@paypa1-secure.co>
Reply-To: <paypal.resolution.center@outlook.com>
To: undisclosed-recipients:;
Subject: Your account has been limited
Date: Sun, 22 Nov 2026 03:14:00 +0100
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="b1"

--b1
Content-Type: text/plain; charset=utf-8

Dear Customer, we noticed unusual sign-in activity.

--b1
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: quoted-printable

<html><body>
<img src=3D"https://cdn-static-img.top/paypal-logo.png" alt=3D"PayPal logo" width=3D"120" height=3D"40">
<p>Dear Customer,</p>
<p>We noticed unusual sign-in activity on your account. Your account has been limited until you verify your identity.</p>
<p>Please confirm your card details within 24 hours, otherwise your account will be permanently suspended.</p>
<p><a href=3D"http://paypal.com.account-verify.xyz/login?session=3D8812">https://www.paypal.com/signin</a></p>
<p>This email was scanned and verified safe by Norton.</p>
<div style=3D"display:none">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum</div>
</body></html>
--b1--
`,
    },
    {
      id: "parcel",
      label: "Smishing-style: bpost customs fee (Dutch)",
      expect: "danger",
      raw: `From: bpost <info@bpost-levering-be.top>
To: jij@example.be
Subject: Uw pakket staat in de wacht
Date: Tue, 24 Nov 2026 10:02:00 +0100
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<html><body>
<p>Beste klant,</p>
<p>Uw pakket kon niet worden bezorgd omdat er nog douanekosten openstaan van &euro;1,99.</p>
<p>Betaal binnen 24 uur, anders wordt het pakket teruggestuurd.</p>
<p><a href="https://bit.ly/3xBpostPay" style="background:#e30613;color:#fff;padding:10px">Betaal nu</a></p>
</body></html>
`,
    },
    {
      id: "ceo",
      label: "CEO fraud: gift cards \"for a client\"",
      expect: "warning",
      raw: `From: "Director Office" <director.office.ceo@gmail.com>
To: you@school.be
Subject: Quick favour
Date: Mon, 23 Nov 2026 08:41:00 +0100
Content-Type: text/plain; charset=utf-8

Hi,

Are you available? I'm in a meeting and can't talk right now.
I need you to buy some gift cards for a client today. Keep this confidential, I want it to be a surprise.
Reply by email only and I'll tell you the amounts.

Thanks
`,
    },
    {
      id: "voicemail",
      label: "HTML attachment: \"voicemail\" login page",
      expect: "danger",
      raw: `From: "Voicemail Service" <noreply@voice-mail-alerts.net>
To: you@school.be
Subject: RE: You have a new voice message (00:47)
Date: Mon, 23 Nov 2026 14:20:00 +0100
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="mix"

--mix
Content-Type: text/plain; charset=utf-8

You received a new voice message. Open the attachment to listen.

--mix
Content-Type: text/html; name="Voicemail_0234.html"
Content-Disposition: attachment; filename="Voicemail_0234.html"
Content-Transfer-Encoding: base64

PGh0bWw+PGJvZHk+PGgzPlZvaWNlbWFpbCAtIHNpZ24gaW4gdG8gbGlzdGVuPC9oMz48Zm9ybSBh
Y3Rpb249Imh0dHBzOi8vZXZpbC5leGFtcGxlL3AiPjxpbnB1dCB0eXBlPSJlbWFpbCIgbmFtZT0i
dSI+PGlucHV0IHR5cGU9InBhc3N3b3JkIiBuYW1lPSJwdyI+PC9mb3JtPjxzY3JpcHQ+ZG9jdW1l
bnQuZm9ybXNbMF0uYWN0aW9uPWF0b2IoImFIUjBjSE02THk5bGRtbHNMbVY0WVcxd2JHVXZjQT09
Iik8L3NjcmlwdD48L2JvZHk+PC9odG1sPg==
--mix--
`,
    },
    {
      id: "callback",
      label: "Callback scam: fake Geek Squad renewal",
      expect: "danger",
      raw: `From: "Geek Squad Billing" <geeksquad.billing.dept@outlook.com>
To: you@example.com
Subject: Invoice #GS-88120 - Your subscription has been renewed
Date: Mon, 23 Nov 2026 11:05:00 -0500
Content-Type: text/plain; charset=utf-8

Dear Customer,

Thank you for renewing your Geek Squad Total Protection subscription.
Your card has been charged $399.99 for the auto-renewal.

Order number: GS-88120
If you did not authorize this transaction, call our billing helpline at +1 (808) 555-0199 within 24 hours to cancel and get a refund.
`,
    },
    {
      id: "donation",
      label: "Advance fee: \"Warren Buffett\" donation",
      expect: "danger",
      raw: `From: Warren Buffett <quick-mail@relay.example.ne.jp>
To: you@gmail.com
Subject: Re: CONGRATULATIONS.
Date: Tue, 24 Nov 2026 00:50:00 +0900
Content-Type: text/html; charset=utf-8

<div>Hello,</div><br>
<div><u><b>Congratulations, the amount of $4,750,500.00 USD was donated to you by The Buffett Foundation.</b></u></div><br>
<div>For more information on how to claim the money, please reply to me if this your selected (EMAIL) is Valid</div><br>
<div>I am waiting for your email to confirm that this email is valid.</div><br>
<div>Regards<br><span style="color:#888">Warren Buffett<br>The Buffett Foundation</span></div>
`,
    },
    {
      id: "casino",
      label: "Spam: online casino bonus (Dutch)",
      expect: "warning",
      raw: `From: =?utf-8?Q?een_schouderklopje=F0=9F=8E=89!?= <kTRvBQ2x9@qowevx4tpzki7a.com>
To: jij@gmail.com
Subject: Uw exclusieve bonus wacht op u
Date: Tue, 27 Oct 2026 17:13:00 +0100
Content-Type: text/html; charset=utf-8

<div style="background:#0b0d14;color:#fff;padding:24px;text-align:center">
<p>VIP Casino BE &bull; Edition Sp&eacute;ciale</p>
<h1>CASINO SPINMILLION DELUXE</h1>
<p>Gefeliciteerd, speler! Uw exclusieve bonus wacht op u!</p>
<p>WELKOMSTPAKKET<br>tot &euro;750<br>+ 100 Gratis Spins</p>
<p><a href="https://spinmillion-vip.pages.dev/claim" style="background:#2563eb;color:#fff;padding:12px">Claim mijn bonus</a></p>
</div>
`,
    },
    {
      id: "iptv",
      label: "Spam: pirate TV (IPTV) subscription",
      expect: "warning",
      raw: `From: Toronto <tvdealz8k2q@gmx.de>
To: you@gmail.com
Subject: 14 months premium TV for EUR 59
Date: Tue, 17 Nov 2026 19:25:00 +0100
Content-Type: text/plain; charset=utf-8

Enjoy 14 months of premium entertainment for just EUR 59!

WHAT'S INCLUDED?

[TV] 50,000+ Live TV Channels
[MOVIES] 100,000+ Movies & Series
[SPORTS] Live Sports & International Channels
[4K] HD, Full HD & 4K Quality
[DEVICES] Smart TV, Fire Stick, Android, iPhone & More

YOUR EXCLUSIVE OFFER
12 Months + 2 Months FREE = 14 Months
PRICE: ONLY EUR 59 - ONE PAYMENT!

READY TO GET STARTED?
CLAIM YOUR OFFER NOW:
https://wa.link/x7k2pq

WhatsApp: +44 7700 900123
`,
    },
    {
      id: "newsletter",
      label: "Legitimate: shop newsletter",
      expect: "safe",
      raw: `Authentication-Results: mx.google.com;
       dkim=pass header.i=@coolblue.be;
       spf=pass smtp.mailfrom=bounce@mail.coolblue.be;
       dmarc=pass (p=REJECT) header.from=coolblue.be
From: Coolblue <info@mail.coolblue.be>
To: jij@example.be
Subject: Deze week in de aanbieding
Date: Thu, 19 Nov 2026 09:00:00 +0100
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<html><body>
<div style="display:none;max-height:0;overflow:hidden">De beste deals van deze week, alleen online.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<p>Hallo,</p>
<p>Deze week hebben we weer mooie aanbiedingen voor je klaargezet: laptops, koffiezetapparaten en meer.</p>
<p><a href="https://www.coolblue.be/nl/aanbiedingen?utm_source=newsletter">Bekijk alle aanbiedingen</a></p>
<p><a href="https://www.coolblue.be/nl/laptops">Laptops</a> · <a href="https://www.coolblue.be/nl/koffie">Koffie</a></p>
<p>Je ontvangt deze e-mail omdat je je hebt ingeschreven. <a href="https://www.coolblue.be/nl/uitschrijven">Uitschrijven</a></p>
</body></html>
`,
    },
    {
      id: "friend",
      label: "Legitimate: reply from a classmate",
      expect: "safe",
      raw: `Authentication-Results: mx.google.com;
       dkim=pass header.i=@gmail.com;
       spf=pass smtp.mailfrom=lotte.janssens@gmail.com;
       dmarc=pass (p=NONE) header.from=gmail.com
From: Lotte Janssens <lotte.janssens@gmail.com>
To: you@gmail.com
Subject: Re: groepswerk geschiedenis
Date: Wed, 18 Nov 2026 16:12:00 +0100
Content-Type: text/plain; charset=utf-8

Top, ik neem het deel over de Eerste Wereldoorlog. Zullen we donderdag na school afspreken?

Op wo 18 nov 2026 om 15:40 schreef jij <you@gmail.com>:
> Wie doet welk deel van de presentatie?
`,
    },
  ];
})(globalThis.ScamDetector = globalThis.ScamDetector || {});
