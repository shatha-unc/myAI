import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { Chat, Intention, intentionSchema, IntentionType } from "@/types";
import { HISTORY_CONTEXT_LENGTH } from "@/configuration/chat";
import { INTENTION_PROMPT } from "@/configuration/prompts";
import { INTENTION_MODEL } from "@/configuration/models";

/**
 * IntentionModule is responsible for detecting intentions
 */
export class IntentionModule {
  static async detectIntention({
    chat,
    openai,
  }: {
    chat: Chat;
    openai: OpenAI;
  }): Promise<Intention> {
    /**
     * Determine the intention of the user based on the most recent messages
     */
    const mostRecentMessages = chat.messages
      .slice(-HISTORY_CONTEXT_LENGTH)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const response = await openai.beta.chat.completions.parse({
      model: INTENTION_MODEL,
      messages: [
        { role: "system", content: INTENTION_PROMPT() },
        ...mostRecentMessages,
      ],
      response_format: zodResponseFormat(intentionSchema, "intention"),
    });

    if (!response.choices[0].message.parsed) {
      return { type: "random" as IntentionType };
    }
    return response.choices[0].message.parsed;
  }

  static async moderateMessage({
    message,
    openai,
  }: {
    message: string;
    openai: OpenAI;
  }): Promise<boolean> {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: message,
    });
    console.log("response.results[0].flagged", response.results[0].flagged);
    return response.results[0].flagged;
  }
}
