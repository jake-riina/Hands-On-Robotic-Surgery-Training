import { supabase } from './supabaseClient';
import { getCurrentUserProfile } from './userService';

const MODULE_1_ID = 1;
const MODULE_1_EDGE_FUNCTION = 'calculate-pressure-score';

export type Module1SessionCreateResult =
  | { ok: true; sessionId: string; startedAt: string }
  | { ok: false; error: string };

export type Module1PressureTelemetrySample = {
  recorded_at: string;
  psi_value: number;
};

export async function createModule1Session(
  gloveMacAddress: string | null = null
): Promise<Module1SessionCreateResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: 'Please log in to begin training.' };
  }

  const profile = await getCurrentUserProfile();

  let gloveId: string | null = null;
  if (gloveMacAddress?.trim()) {
    const { data: gloveRow, error: gloveError } = await supabase
      .from('gloves')
      .upsert(
        {
          mac_address: gloveMacAddress,
        },
        { onConflict: 'mac_address' }
      )
      .select('glove_id')
      .single();

    if (gloveError || !gloveRow?.glove_id) {
      console.error('createModule1Session glove upsert', gloveError);
      return { ok: false, error: gloveError?.message ?? 'Could not resolve glove id.' };
    }

    gloveId = gloveRow.glove_id as string;
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      module_id: MODULE_1_ID,
      department_id: profile?.department_id ?? null,
      glove_id: gloveId,
      status: 'in_progress',
    })
    .select('session_id, started_at')
    .single();

  if (error || !data?.session_id || !data.started_at) {
    console.error('createModule1Session', error);
    return { ok: false, error: error?.message ?? 'Could not start Module 1 session.' };
  }

  return {
    ok: true,
    sessionId: data.session_id as string,
    startedAt: data.started_at as string,
  };
}

export async function insertPressureTelemetryBatch(
  sessionId: string,
  rows: Module1PressureTelemetrySample[]
): Promise<void> {
  if (!sessionId || rows.length === 0) return;

  const { error } = await supabase.from('pressure_telemetry').insert(
    rows.map((r) => ({
      session_id: sessionId,
      recorded_at: r.recorded_at,
      psi_value: r.psi_value,
    }))
  );

  if (error) {
    console.error('insertPressureTelemetryBatch', error);
  }
}

export async function invokeModule1CompleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke(MODULE_1_EDGE_FUNCTION, {
    body: { session_id: sessionId, action: 'complete' },
  });
  if (error) {
    console.error('invokeModule1CompleteSession', error);
  }
}

export async function invokeModule1AbandonSession(sessionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke(MODULE_1_EDGE_FUNCTION, {
    body: { session_id: sessionId, action: 'abandon' },
  });
  if (error) {
    console.error('invokeModule1AbandonSession', error);
  }
}
