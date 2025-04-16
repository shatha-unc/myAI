import { HYDE_MODEL, HYDE_TEMPERATURE } from "@/configuration/models";
import { QUESTION_RESPONSE_TOP_K } from "@/configuration/pinecone";
import { HYDE_PROMPT } from "@/configuration/prompts";
import { Chat, Chunk, chunkSchema, CoreMessage, DisplayMessage } from "@/types";
import OpenAI from "openai";

export function stripMessagesOfCitations(
  messages: DisplayMessage[]
): DisplayMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content.replace(/\[\d+\]/g, ""),
    citations: [],
  }));
}

export function convertToCoreMessages(
  messages: DisplayMessage[]
): CoreMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

export function addSystemMessage(
  messages: CoreMessage[],
  systemMessage: string
): CoreMessage[] {
  return [{ role: "system", content: systemMessage }, ...messages];
}

export async function embedHypotheticalData(
  value: string,
  openai: OpenAI
): Promise<{ embedding: number[] }> {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: value,
    });

    return { embedding: embedding.data[0].embedding };
  } catch (error) {
    throw new Error("Error embedding hypothetical data");
  }
}
