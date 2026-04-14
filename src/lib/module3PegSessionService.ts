import { supabase } from './supabaseClient';
import { getCurrentUserProfile } from './userService';

/** Must match the deployed Supabase Edge Function slug (single handler: `action` complete | abandon). */
const MODULE_3_EDGE_FUNCTION = 'calculate-peg-score';

const MODULE_3_ID = 3;

/** `react-router` location state for `/module/3/peg-transfer` after Begin Training. */
export type Module3PegTransferRouteState = {
  sessionId: string;
  startedAt: string;
};

export type Side = 'left' | 'right';

export type Module3SessionCreateResult =
  | { ok: true; sessionId: string; startedAt: string }
  | { ok: false; error: string };

export type PegRingRow = {
  ring_id: string;
  session_id: string;
  ring_index: number;
  starting_side: Side;
  target_peg_label: string;
  is_completed: boolean;
};

export type Module3PegScoreResults = {
  score: number;
  transfers_completed: number;
  total_transfers: number;
  avg_time_per_transfer: number | null;
  total_drops: number;
  time_to_completion: number;
};

export type Module3CompleteSessionResult =
  | { ok: true; results: Module3PegScoreResults }
  | { ok: false; error: string };

export type Module3AbandonSessionResult = { ok: true } | { ok: false; error: string };

type OwnedModule3SessionGuard =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Ensures the session exists, belongs to the signed-in user, is Module 3, and is still in progress.
 * Mirrors the edge function’s expectations so we avoid noisy invokes (similar intent to Module 2’s
 * session lifecycle guards in the page layer, but enforced here for abandon/complete).
 */
async function requireOwnedModule3SessionInProgress(sessionId: string): Promise<OwnedModule3SessionGuard> {
  if (!sessionId?.trim()) {
    return { ok: false, error: 'Missing session id.' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: 'Please log in to continue.' };
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .select('session_id, user_id, module_id, status')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('requireOwnedModule3SessionInProgress', error);
    return { ok: false, error: error.message ?? 'Could not verify session.' };
  }
  if (!session) {
    return { ok: false, error: 'Session not found.' };
  }
  if (session.user_id !== user.id) {
    return { ok: false, error: 'Not your session.' };
  }
  if (session.module_id !== MODULE_3_ID) {
    return { ok: false, error: 'This session is not Module 3.' };
  }
  if (session.status !== 'in_progress') {
    return { ok: false, error: `Session is already ${session.status}.` };
  }

  return { ok: true };
}

// ── Session initialization ─────────────────────────────────

/**
 * Creates a Module 3 session with `user_id` bound to `auth.uid()` (same pattern as Module 2).
 */
export async function createModule3Session(
  gloveId: string | null = null
): Promise<Module3SessionCreateResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: 'Please log in to begin training.' };
  }

  const profile = await getCurrentUserProfile();
  if (!profile?.department_id) {
    return {
      ok: false,
      error: 'Your account is missing a department. Contact an administrator.',
    };
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      module_id: MODULE_3_ID,
      department_id: profile.department_id,
      glove_id: gloveId,
      status: 'in_progress',
    })
    .select('session_id, started_at')
    .single();

  if (error || !data?.session_id || !data.started_at) {
    console.error('createModule3Session', error);
    return { ok: false, error: error?.message ?? 'Could not start session.' };
  }

  return {
    ok: true,
    sessionId: data.session_id as string,
    startedAt: data.started_at as string,
  };
}

/** Inserts the five ring rows once the countdown ends / module begins. */
export async function initPegRings(
  sessionId: string,
  ringConfigs: { ring_index: number; target_peg_label: string }[]
): Promise<{ ok: true; rings: PegRingRow[] } | { ok: false; error: string }> {
  const rows = ringConfigs.map((ring) => ({
    session_id: sessionId,
    ring_index: ring.ring_index,
    starting_side: [1, 3, 5].includes(ring.ring_index) ? 'left' : 'right',
    target_peg_label: ring.target_peg_label,
    is_completed: false,
  }));

  const { data, error } = await supabase.from('peg_rings').insert(rows).select('*');

  if (error) {
    console.error('initPegRings', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, rings: (data ?? []) as PegRingRow[] };
}

// ── Transfer logging ───────────────────────────────────────

export async function startHandToHandTransfer(
  sessionId: string,
  ringId: string,
  fromSide: Side,
  toSide: Side
): Promise<{ ok: true; transferId: string } | { ok: false; error: string }> {
  if (fromSide === toSide) {
    return { ok: false, error: 'hand_to_hand requires different from_side and to_side (DB constraint).' };
  }

  const { data, error } = await supabase
    .from('peg_transfers')
    .insert({
      session_id: sessionId,
      ring_id: ringId,
      transfer_type: 'hand_to_hand',
      from_side: fromSide,
      to_side: toSide,
      picked_up_at: new Date().toISOString(),
      is_completed: false,
      is_drop: false,
    })
    .select('transfer_id')
    .single();

  if (error || !data?.transfer_id) {
    console.error('startHandToHandTransfer', error);
    return { ok: false, error: error?.message ?? 'Failed to start hand_to_hand transfer.' };
  }

  return { ok: true, transferId: data.transfer_id as string };
}

export async function completeTransfer(
  transferId: string
): Promise<
  { ok: true; placedAt: string; durationSeconds: number } | { ok: false; error: string }
> {
  const { data: existing, error: readError } = await supabase
    .from('peg_transfers')
    .select('picked_up_at')
    .eq('transfer_id', transferId)
    .single();

  if (readError || !existing) {
    return { ok: false, error: readError?.message ?? 'Transfer not found.' };
  }

  const placedAt = new Date().toISOString();
  const durationSeconds =
    (new Date(placedAt).getTime() - new Date(existing.picked_up_at).getTime()) / 1000;

  const { error } = await supabase
    .from('peg_transfers')
    .update({
      placed_at: placedAt,
      duration_seconds: durationSeconds,
      is_completed: true,
      is_drop: false,
    })
    .eq('transfer_id', transferId);

  if (error) {
    console.error('completeTransfer', error);
    return { ok: false, error: error.message };
  }

  return { ok: true, placedAt, durationSeconds };
}

/**
 * `picked_up_at` is carried from the completed hand_to_hand’s `placed_at`.
 * `hand_to_peg` uses the same `from_side` and `to_side` (peg side) per DB `chk_transfer_side_logic`.
 */
export async function startHandToPegTransfer(
  sessionId: string,
  ringId: string,
  side: Side,
  handToHandTransferId: string
): Promise<{ ok: true; transferId: string } | { ok: false; error: string }> {
  const { data: handToHand, error: readError } = await supabase
    .from('peg_transfers')
    .select('placed_at')
    .eq('transfer_id', handToHandTransferId)
    .single();

  if (readError || !handToHand?.placed_at) {
    return {
      ok: false,
      error: readError?.message ?? 'Completed hand_to_hand transfer not found.',
    };
  }

  const { data, error } = await supabase
    .from('peg_transfers')
    .insert({
      session_id: sessionId,
      ring_id: ringId,
      transfer_type: 'hand_to_peg',
      from_side: side,
      to_side: side,
      picked_up_at: handToHand.placed_at,
      is_completed: false,
      is_drop: false,
    })
    .select('transfer_id')
    .single();

  if (error || !data?.transfer_id) {
    console.error('startHandToPegTransfer', error);
    return { ok: false, error: error?.message ?? 'Failed to start hand_to_peg transfer.' };
  }

  return { ok: true, transferId: data.transfer_id as string };
}

export async function dropTransfer(
  transferId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from('peg_transfers')
    .update({
      is_drop: true,
      is_completed: false,
      placed_at: null,
      duration_seconds: null,
    })
    .eq('transfer_id', transferId);

  if (error) {
    console.error('dropTransfer', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function markRingCompleted(
  ringId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('peg_rings').update({ is_completed: true }).eq('ring_id', ringId);

  if (error) {
    console.error('markRingCompleted', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ── Session completion / abandonment (edge function) ───────

export async function invokeModule3CompleteSession(
  sessionId: string
): Promise<Module3CompleteSessionResult> {
  const guard = await requireOwnedModule3SessionInProgress(sessionId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const { data, error } = await supabase.functions.invoke(MODULE_3_EDGE_FUNCTION, {
    body: { session_id: sessionId, action: 'complete' },
  });

  if (error) {
    console.error('invokeModule3CompleteSession', error);
    return { ok: false, error: error.message };
  }

  const body = data as
    | { success?: boolean; error?: string; results?: Module3PegScoreResults }
    | null
    | undefined;

  if (!body?.success || !body.results) {
    return {
      ok: false,
      error: body?.error ?? 'Failed to complete session.',
    };
  }

  return { ok: true, results: body.results };
}

export async function invokeModule3AbandonSession(
  sessionId: string
): Promise<Module3AbandonSessionResult> {
  const guard = await requireOwnedModule3SessionInProgress(sessionId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const { data, error } = await supabase.functions.invoke(MODULE_3_EDGE_FUNCTION, {
    body: { session_id: sessionId, action: 'abandon' },
  });

  if (error) {
    console.error('invokeModule3AbandonSession', error);
    return { ok: false, error: error.message };
  }

  const body = data as { success?: boolean; error?: string } | null | undefined;

  if (!body?.success) {
    return {
      ok: false,
      error: body?.error ?? 'Failed to abandon session.',
    };
  }

  return { ok: true };
}
