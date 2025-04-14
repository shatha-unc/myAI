import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { AIProviders, Chat, Intention } from "@/types";
import { IntentionModule } from "@/modules/intention";
import { ResponseModule } from "@/modules/response";
import { PINECONE_INDEX_NAME } from "@/configuration/pinecone";
import Anthropic from "@anthropic-ai/sdk";
import { SAVE_TO_HISTORY } from "@/configuration/supabase";
import { saveMessageToHistory } from "@/utilities/supabase";
import { USE_CONTENT_MODERATION } from "@/configuration/chat";

export const maxDuration = 60;

// Get API keys
const pineconeApiKey = process.env.PINECONE_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const fireworksApiKey = process.env.FIREWORKS_API_KEY;

// Check if API keys are set
if (!pineconeApiKey) {
  throw new Error("PINECONE_API_KEY is not set");
}
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

// Initialize Pinecone
const pineconeClient = new Pinecone({
  apiKey: pineconeApiKey,
});
const pineconeIndex = pineconeClient.Index(PINECONE_INDEX_NAME);

// Initialize Providers
const openaiClient = new OpenAI({
  apiKey: openaiApiKey,
});
const anthropicClient = new Anthropic({
  apiKey: anthropicApiKey,
});
const fireworksClient = new OpenAI({
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: fireworksApiKey,
});
const providers: AIProviders = {
  openai: openaiClient,
  anthropic: anthropicClient,
  fireworks: fireworksClient,
};

async function evaluateMessage(chat: Chat): Promise<{
  intention: Intention;
  isFlagged: boolean | undefined;
}> {
  const intentionPromise = IntentionModule.detectIntention({
    chat: chat,
    openai: providers.openai,
  });

  let moderationPromise: Promise<boolean> | undefined;
  if (USE_CONTENT_MODERATION) {
    moderationPromise = IntentionModule.moderateMessage({
      message: chat.messages[chat.messages.length - 1].content,
      openai: providers.openai,
    });
  }

  const [intention, isFlagged] = await Promise.all([
    intentionPromise,
    moderationPromise || Promise.resolve(undefined),
  ]);

  return { intention, isFlagged };
}

export async function POST(req: Request) {
  const { chat } = await req.json();

  const { intention, isFlagged } = await evaluateMessage(chat);

  if (SAVE_TO_HISTORY) {
    await saveMessageToHistory({
      role: "user",
      content: chat.messages[chat.messages.length - 1].content,
    });
  }

  if (intention.type === "question" && !isFlagged) {
    return ResponseModule.respondToQuestion(chat, providers, pineconeIndex);
  } else if (intention.type === "hostile_message" || isFlagged) {
    return ResponseModule.respondToHostileMessage(chat, providers);
  } else {
    return ResponseModule.respondToRandomMessage(chat, providers);
  }
}
