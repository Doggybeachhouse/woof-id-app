# Woof ID — Doggy Beach House

Mobiele webapp (PWA) voor hondprofielen, check-ins, Woof Coins en achievements.  
**Los van** de WordPress-plugin `woofwallet-mplus` — die blijft voor wallet + webshop.

## Waarom geen volledige WordPress-plugin?

| WordPress-plugin | Deze app (aanbevolen) |
|------------------|----------------------|
| Zwaar op WordPress.com | Eigen Next.js-app |
| Database + auth in WP | Prisma + NextAuth |
| Moeilijk PWA | PWA klaar |
| Risico voor Woof Wallet | `woofwallet-mplus` blijft intact |

Koppeling met de site: dunne bridge-plugin in `wordpress/doggy-woof-bridge/`.

## Kosten: €0

| Onderdeel | Kosten |
|-----------|--------|
| Lokaal draaien (SQLite) | Gratis |
| Vercel hosting (hobby) | Gratis |
| Neon Postgres (optioneel, productie) | Gratis tier |
| Bon registreren (handmatig) | Gratis |
| Bonfoto + AI | Alleen met `OPENAI_API_KEY` (optioneel) |
| Mplus walletsaldo | Later, via STN (geen extra API-abonnement verwacht) |

## Lokaal starten (Windows)

```powershell
cd C:\Users\POS\woof-id-app
.\run-dev.ps1
```

Eerste keer:

```powershell
$env:PATH = "C:\Users\POS\tools\node\node-v22.13.0-win-x64;$env:PATH"
copy .env.example .env
# Pas NEXTAUTH_SECRET aan (willekeurige lange string)

npx prisma migrate dev --name init
npm run prisma:seed
```

Open [http://localhost:3000](http://localhost:3000). **Eerste account = admin.**

Productcatalogus: `data/artikelen.csv` (export uit MplusQ, staat al in het project).

## Functies

- Registreren / inloggen
- Hondprofiel + Woof ID (`WBH-XXXXX`)
- Woof Wallet-kaartnummer koppelen
- QR check-in (+25 coins)
- **Bon registreren** — producten uit catalogus (gratis)
- Bonfoto (optioneel, OpenAI)
- Achievements + journey timeline
- Admin: honden, handmatige top-ups

## WordPress bridge installeren

1. Zip de map `wordpress/doggy-woof-bridge/`
2. WordPress → Plugins → Upload → Activeren
3. Instellingen → **Woof ID Bridge** → URL (bijv. `https://woof.doggybeachhouse.com`)
4. Klanten zien **Woof ID** in Mijn account (naast Woof Wallet)

## Productie (gratis)

1. Push naar GitHub
2. [Vercel](https://vercel.com) → Import project
3. Env vars: `DATABASE_URL` (Neon free), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
4. Voor automatische Woof Wallet-aankopen via Mplus kassa: `MPLUS_WEBHOOK_SECRET` (Base64 secret uit Mplus webhook-abonnement)
5. Voor beloningsvouchers (`WVH…` codes) bij de kassa: zelfde webhook-abonnement + zie [docs/MPLUS_VOUCHER_WEBHOOKS.md](docs/MPLUS_VOUCHER_WEBHOOKS.md)
6. Optioneel — nieuwe Woof ID-klanten automatisch in Mplus kassa zichtbaar maken: `MPLUS_API_URL`, `MPLUS_IDENT`, `MPLUS_SECRET`, `MPLUS_KASSA_AUTO_SYNC=true` (zie hieronder)
7. Subdomain `woof.doggybeachhouse.com` → CNAME naar Vercel

Voor SQLite alleen lokaal; productie gebruikt Postgres (Neon gratis).

## Later: live walletsaldo

Als STN API-credentials levert → bridge of `woofwallet-mplus` uitbreiden met `getGiftcard`. Woof ID hoeft daar niet op te wachten.

## Mplus kassa sync (optioneel)

Met `MPLUS_KASSA_AUTO_SYNC=true` en API-credentials:

- **Bij registratie** — `findRelation` / `createRelation` op e-mail; `mplusRelationNumber` op `User`
- **Bij hond aanmaken** — relation bijwerken met Woof ID + hondnaam in `extraText`; zonder handmatig wallet-nummer wordt via `createGiftcard` een Woof Wallet aangemaakt en gekoppeld

Registratie of hond aanmaken faalt **niet** als Mplus offline is. Handmatig wallet-nummer blijft werken (fysieke kaart).

Benodigd in Mplus backoffice: een actief **Woof Wallet** giftcard-type en API-rechten voor `createRelation` + `createGiftcard`. Optioneel: `MPLUS_EMPLOYEE_NUMBER` (standaard `1`).
