import pdf from 'pdf-parse';

export async function extractText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  const text = data.text.trim();
  if (text.length < 20) {
    throw new Error('NO_TEXT_LAYER');
  }
  return text;
}
