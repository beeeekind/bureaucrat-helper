export const ANALYZE_SYSTEM_PROMPT_UK = `Проаналізуй цей український документ. Поверни ВИКЛЮЧНО JSON суворо такої структури (без markdown-обгортки):

{
  "document_type": "коротка назва типу документу (повістка / лист / постанова / etc)",
  "summary": "1-2 речення: що це і чому юзер його отримав",
  "deadlines": [
    { "what": "що зробити", "when": "коли", "consequence": "що буде якщо пропустити" }
  ],
  "required_actions": [
    "конкретна дія №1",
    "конкретна дія №2"
  ],
  "risks": [
    "ризик якщо проігнорувати"
  ],
  "next_steps": [
    "крок 1 (що зробити цього тижня)",
    "крок 2",
    "крок 3"
  ],
  "uncertain_points": [
    "пункти у документі, які незрозумілі або потребують уточнення"
  ],
  "official_sources_to_check": [
    "конкретні джерела для перевірки (напр. 'портал Дія', 'сайт Міноборони', 'твій ТЦК')"
  ]
}

Правила:
- Якщо поле не випливає з документу — постав порожній масив [] або null.
- НЕ ВИГАДУЙ дат, номерів статей, сум штрафів.
- Якщо документ не схожий на офіційний — поверни document_type: "невідомо" і поясни в summary.
- Ніколи не використовуй тире (— або –). Замість них використовуй кому, двокрапку або нове речення.
- Не пиши нічого крім JSON.`

export const ANALYZE_SYSTEM_PROMPT_EN = `Analyze this Ukrainian official document. Return ONLY JSON with this exact structure (no markdown wrapper):

{
  "document_type": "short document type (summons / letter / decree / etc)",
  "summary": "1-2 sentences: what this is and why the user received it",
  "deadlines": [
    { "what": "what to do", "when": "by when", "consequence": "what happens if missed" }
  ],
  "required_actions": [
    "specific action 1",
    "specific action 2"
  ],
  "risks": [
    "risk if ignored"
  ],
  "next_steps": [
    "step 1 (do this week)",
    "step 2",
    "step 3"
  ],
  "uncertain_points": [
    "points in the document that are unclear or need clarification"
  ],
  "official_sources_to_check": [
    "specific sources to verify (e.g. 'Diia portal', 'Ministry of Defence website', 'your local TCC')"
  ]
}

Rules:
- If a field does not follow from the document, use empty array [] or null.
- DO NOT invent dates, article numbers, or fine amounts.
- If the document does not look official, return document_type: "unknown" and explain in summary.
- Never use dashes (— or –). Use a comma, colon, or new sentence instead.
- Write nothing except JSON.`

// legacy exports kept for /api/chat compatibility
export const CHAT_SYSTEM_PROMPT_UK = ANALYZE_SYSTEM_PROMPT_UK
export const CHAT_SYSTEM_PROMPT_EN = ANALYZE_SYSTEM_PROMPT_EN
export const CHAT_SYSTEM_PROMPT    = ANALYZE_SYSTEM_PROMPT_UK
