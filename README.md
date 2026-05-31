# GoaTalk — Voice notes for two

Encrypted voice ranting app for pairs. Record audio rants, get AI transcriptions, react with emojis, and stay in sync — all end-to-end encrypted.

## Features

- **Voice rants** — Record and send audio messages with automatic transcription
- **End-to-end encryption** — AES-256-GCM + PBKDF2; server never sees plaintext
- **Multi-provider transcription** — Browser Web Speech, HuggingFace, Deepgram, OpenAI, Groq
- **Board & long notes** — Pinboard-style notes and long-form encrypted entries
- **Privacy overlays** — Blur sensitive content, reveal on tap
- **Reactions & tags** — Emoji reactions, color-coded tags on rants
- **Desktop & mobile** — Sidebar layout on desktop, bottom nav on mobile
- **Offline support** — IndexedDB-backed, syncs when online
- **Pairing** — Share a pairing code to connect two devices securely

## Tech stack

[React](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Vite](https://vitejs.dev) · [Tailwind CSS v4](https://tailwindcss.com) · [Cloudflare Pages](https://pages.cloudflare.com) · [IndexedDB (idb)](https://github.com/jakearchibald/idb) · [i18next](https://www.i18next.com)

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
npm run preview
```

## Deployment

The app is designed to run on Cloudflare Pages with a Functions backend and KV storage.

```bash
npm run deploy
```

Required secrets (set via `wrangler secret put`):

| Secret | Description |
|---|---|
| `HUGGINGFACE_TOKEN` | HuggingFace API token for free transcription |
| `DEEPGRAM_API_KEY` | Deepgram API key (free tier has $200 credit) |

## License

MIT
