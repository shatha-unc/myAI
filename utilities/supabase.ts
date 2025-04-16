"use server";

import { createClient } from "@supabase/supabase-js";
import { SAVE_TO_HISTORY, HISTORY_TABLE_NAME } from "@/configuration/supabase";
import { CoreMessage } from "@/types";

const supabaseUrl: string | undefined = process.env.SUPABASE_URL;
const supabaseKey: string | undefined = process.env.SUPABASE_KEY;

if (SAVE_TO_HISTORY && (!supabaseUrl || !supabaseKey)) {
  throw new Error(
    "Supabase URL or key is not set, but SAVE_TO_HISTORY is enabled"
  );
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function saveMessageToHistory(message: CoreMessage) {
  if (!SAVE_TO_HISTORY) {
    return;
  }

  const { data, error } = await supabase
    .from(HISTORY_TABLE_NAME)
    .insert(message);
}
