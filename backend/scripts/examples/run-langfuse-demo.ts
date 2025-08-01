import { Langfuse, observeOpenAI } from 'langfuse';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
config();

const llm = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

async function main() {
  console.log('main start');
  // Initialize SDKs
  const openai = new OpenAI();

  // 1. Create wrapper span
  const span_name = 'OpenAI-Span';
  const span = langfuse.trace().span({ name: span_name });

  // 2. Call OpenAI and pass `parent` to the `observeOpenAI` function to nest the generation within the span
  const joke = (
    await observeOpenAI(openai, {
      parent: span,
      generationName: 'OpenAI-Generation',
    }).chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: 'Tell me a joke.' }],
    })
  ).choices[0].message.content;

  // 3. End wrapper span to get span-level latencies
  span.end();
  await langfuse.shutdownAsync();
}

main().catch((error) => {
  console.error(error);
});

console.log('Finished');
