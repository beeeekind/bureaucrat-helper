# Бюрократ-хелпер

Upload an official Ukrainian bureaucratic document (PDF) and get a plain-language breakdown of what it says, what you need to do, and what happens if you ignore it.

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set your API key**
   Edit `.env.local` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Fill in the prompts**
   Open `lib/prompts.ts` and replace the `TODO` values with a real system prompt and analysis prompt. The analysis prompt should instruct Claude to return a JSON object with these fields:
   ```json
   {
     "document_type": "string",
     "summary": "string",
     "deadlines": ["string"],
     "required_actions": ["string"],
     "risks": ["string"],
     "next_steps": ["string"],
     "uncertain_points": ["string"],
     "official_sources_to_check": ["string"]
   }
   ```
   Use `{{DOCUMENT_TEXT}}` as the placeholder for the extracted PDF text.

4. **Start the dev server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key. Get one at console.anthropic.com. |

## How it works

1. User drops a PDF onto the upload zone (max 10 MB).
2. The PDF is POSTed to `/api/analyze`.
3. The server extracts text with `pdf-parse`.
4. If the PDF has no text layer, a `422` is returned and the UI shows a message about scans.
5. Otherwise, the extracted text is sent to Claude (`claude-sonnet-4-6`) with the configured prompts.
6. Claude's response streams back as plain text.
7. Once the stream is complete, the client parses the JSON and renders 6 cards.

## Deploy to Vercel

### Перший деплой

1. Запушити репозиторій на GitHub (або GitLab / Bitbucket).

2. Відкрити [vercel.com/new](https://vercel.com/new), обрати репозиторій, натиснути **Deploy**.  
   Vercel автоматично визначить Next.js - додаткових налаштувань фреймворку не потрібно.

3. **Додати env-змінну до деплою:**  
   У Vercel → Project Settings → **Environment Variables** додати:
   ```
   Name:  ANTHROPIC_API_KEY
   Value: sk-ant-api03-...
   ```
   Поставити галочки на **Production**, **Preview**, **Development**.

4. Натиснути **Redeploy** (або задеплоїти повторно через push).

### Оновлення

Кожен `git push` в `main` автоматично тригерить новий деплой на Vercel.

### Локальна перевірка production-білду

```bash
pnpm build && pnpm start
```

Відкрити [http://localhost:3000](http://localhost:3000).

> `.env.local` не потрапляє на Vercel - env-змінні треба вносити вручну через UI або [Vercel CLI](https://vercel.com/docs/cli): `vercel env add ANTHROPIC_API_KEY`.

## Project structure

```
app/
  page.tsx              # main page: upload zone + analysis view
  layout.tsx
  globals.css
  api/
    analyze/route.ts    # POST: extracts PDF text, streams Claude response
components/
  upload-zone.tsx       # drag-and-drop PDF input
  analysis-view.tsx     # renders 6-section structured output
  ui/                   # shadcn/ui components (button, card, input, alert, skeleton)
lib/
  prompts.ts            # SYSTEM_PROMPT and ANALYSIS_PROMPT
  pdf.ts                # extractText(buffer) helper
  types.ts              # AnalysisData interface
  utils.ts              # cn() utility
```
