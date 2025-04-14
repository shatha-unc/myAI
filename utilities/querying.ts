import { HYDE_MODEL, HYDE_TEMPERATURE } from "@/configuration/models";
import { HYDE_PROMPT } from "@/configuration/prompts";
import { Chat, Chunk, chunkSchema } from "@/types";
import OpenAI from "openai";
import { convertToCoreMessages } from "./chat";
import {
  PINECONE_NAMESPACE,
  QUESTION_RESPONSE_TOP_K,
} from "@/configuration/pinecone";
import { Index } from "@pinecone-database/pinecone";

// Hypothetical Document Embedding (HyDe)
export async function generateHypotheticalData(
  chat: Chat,
  openai: OpenAI
): Promise<string> {
  try {
    console.log(
      "Generating hypothetical data...",
      HYDE_MODEL,
      HYDE_TEMPERATURE,
      HYDE_PROMPT(chat)
    );
    const response = await openai.chat.completions.create({
      model: HYDE_MODEL,
      temperature: HYDE_TEMPERATURE,
      messages: await convertToCoreMessages([
        {
          role: "system",
          content: HYDE_PROMPT(chat),
          citations: [],
        },
      ]),
    });

    return response.choices[0].message.content ?? "";
  } catch (error) {
    console.error("Error generating hypothetical data:", error);
    throw new Error("Error generating hypothetical data");
  }
}

export function convertPineconeResultsToChunks(results: any): Chunk[] {
  return results.map((match: any) =>
    chunkSchema.parse({
      text: match.metadata?.text ?? "",
      pre_context: match.metadata?.pre_context ?? "",
      post_context: match.metadata?.post_context ?? "",
      source_url: match.metadata?.source_url ?? "",
      source_description: match.metadata?.source_description ?? "",
      order: match.metadata?.order ?? 0,
    })
  );
}

export async function searchForChunksUsingIntegratedEmbedding(
  pineconeIndex: Index,
  hypotheticalData: string
): Promise<Chunk[]> {
  const results = await pineconeIndex
    .namespace(PINECONE_NAMESPACE)
    .searchRecords({
      query: {
        topK: QUESTION_RESPONSE_TOP_K,
        inputs: { text: hypotheticalData },
      },
    });
  return convertPineconeResultsToChunks(results.result.hits);
}

export async function searchForChunksUsingCustomEmbedding(
  embedding: number[],
  pineconeIndex: any
): Promise<Chunk[]> {
  try {
    const { matches } = await pineconeIndex.query({
      vector: embedding,
      topK: QUESTION_RESPONSE_TOP_K,
      includeMetadata: true,
    });

    return convertPineconeResultsToChunks(matches);
  } catch (error) {
    throw new Error(
      "Error searching for chunks using embedding. Double check Pinecone index name and API key."
    );
  }
}
