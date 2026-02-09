# SlyOS Dashboard

Next.js dashboard for SlyOS. Monitor devices, select models, manage API keys, and view analytics.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Set `NEXT_PUBLIC_API_URL` to point to your backend API:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Features

- **Overview** — Device count, inference stats, cost savings
- **Model Selection** — Browse recommended models, search HuggingFace, or load local models
- **Configuration** — Temperature, max tokens, context window, system prompt
- **Integration Guide** — Copy-paste SDK code with progress callbacks
- **API Keys** — View and copy your API key
- **Devices** — Monitor registered devices with specs and status
- **Settings** — Update profile, change password, manage organization

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Radix UI (shadcn/ui)
- Axios

## Build

```bash
npm run build
npm run start
```

## License

MIT
