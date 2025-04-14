import { Source, Chunk, Citation } from "@/types/data";
import { RESPOND_TO_QUESTION_SYSTEM_PROMPT } from "@/configuration/prompts";
import { citationSchema } from "@/types/data";

export function aggregateSources(chunks: Chunk[]): Source[] {
  const sourceMap = new Map<string, Source>();

  chunks.forEach((chunk) => {
    if (!sourceMap.has(chunk.source_url)) {
      sourceMap.set(chunk.source_url, {
        chunks: [],
        source_url: chunk.source_url,
        source_description: chunk.source_description,
      });
    }
    sourceMap.get(chunk.source_url)!.chunks.push(chunk);
  });

  return Array.from(sourceMap.values());
}

export function sortChunksInSourceByOrder(source: Source): Source {
  source.chunks.sort((a, b) => a.order - b.order);
  return source;
}

export function getSourcesFromChunks(chunks: Chunk[]): Source[] {
  const sources = aggregateSources(chunks);
  return sources.map((source) => sortChunksInSourceByOrder(source));
}

export function buildContextFromOrderedChunks(
  chunks: Chunk[],
  citationNumber: number
): string {
  let context = "";
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    context += chunk.pre_context;
    context += " " + chunk.text + ` [${citationNumber}] `;
    if (
      i === chunks.length - 1 ||
      chunk.post_context !== chunks[i + 1].pre_context
    ) {
      context += chunk.post_context;
    }
    if (i < chunks.length - 1) {
      context += "\n\n";
    }
  }
  return context.trim();
}

export function getContextFromSource(
  source: Source,
  citationNumber: number
): string {
  return `
    <excerpt>
    Source Description: ${source.source_description}
    Source Citation: [${citationNumber}]
    Excerpt from Source [${citationNumber}]:
    ${buildContextFromOrderedChunks(source.chunks, citationNumber)}
    </excerpt>
  `;
}

export function getContextFromSources(sources: Source[]): string {
  return sources
    .map((source, index) => getContextFromSource(source, index + 1))
    .join("\n\n\n");
}

export function buildPromptFromContext(context: string): string {
  // TODO: yes, this is redundant
  return RESPOND_TO_QUESTION_SYSTEM_PROMPT(context);
}

export function getCitationsFromChunks(chunks: Chunk[]): Citation[] {
  return chunks.map((chunk) =>
    citationSchema.parse({
      source_url: chunk.source_url,
      source_description: chunk.source_description,
    })
  );
}
