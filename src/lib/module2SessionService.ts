import { supabase } from './supabaseClient';
import { getCurrentUserProfile } from './userService';

/** Must match the deployed Supabase Edge Function slug (single handler: `action` complete | abandon). */
const MODULE_2_EDGE_FUNCTION = 'module-2-calcs';

export type Module2SessionCreateResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

export async function createModule2Session(): Promise<Module2SessionCreateResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: 'Please log in to begin training.' };
  }

  const profile = await getCurrentUserProfile();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      module_id: 2,
      department_id: profile?.department_id ?? null,
      glove_id: null,
      status: 'in_progress',
    })
    .select('session_id')
    .single();

  if (error || !data?.session_id) {
    console.error('createModule2Session', error);
    return { ok: false, error: error?.message ?? 'Could not start session.' };
  }

  return { ok: true, sessionId: data.session_id as string };
}

export type CameraTelemetrySample = {
  recorded_at: string;
  x: number;
  y: number;
  z: number;
};

/** Written to `camera_orbs` when an orb is collected (capture-time camera + screen state). */
export type CameraOrbCaptureMetrics = {
  capture_cam_x: number;
  capture_cam_y: number;
  capture_cam_z: number;
  capture_forward_x: number;
  capture_forward_y: number;
  capture_forward_z: number;
  capture_screen_dist_px: number;
  capture_screen_radius_px: number;
};

export async function insertCameraTelemetryBatch(
  sessionId: string,
  moduleId: number,
  rows: CameraTelemetrySample[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('camera_telemetry').insert(
    rows.map((r) => ({
      session_id: sessionId,
      module_id: moduleId,
      recorded_at: r.recorded_at,
      cam_x: r.x,
      cam_y: r.y,
      cam_z: r.z,
    }))
  );
  if (error) {
    console.error('insertCameraTelemetryBatch', error);
  }
}

export async function insertCameraOrbRow(params: {
  sessionId: string;
  orbIndex: number;
  x: number;
  y: number;
  z: number;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('camera_orbs')
    .insert({
      session_id: params.sessionId,
      orb_index: params.orbIndex,
      spawn_x: params.x,
      spawn_y: params.y,
      spawn_z: params.z,
      collected: false,
    })
    .select('orb_id')
    .single();

  if (!error && data?.orb_id) {
    return data.orb_id as string;
  }

  if (error?.code === '23505') {
    const { data: existing, error: selErr } = await supabase
      .from('camera_orbs')
      .select('orb_id')
      .eq('session_id', params.sessionId)
      .eq('orb_index', params.orbIndex)
      .maybeSingle();
    if (selErr) console.error('insertCameraOrbRow duplicate select', selErr);
    return (existing?.orb_id as string) ?? null;
  }

  console.error('insertCameraOrbRow', error);
  return null;
}

export async function markCameraOrbCollected(
  orbId: string,
  metrics: CameraOrbCaptureMetrics
): Promise<void> {
  const collected_at = new Date().toISOString();
  const { error } = await supabase
    .from('camera_orbs')
    .update({
      collected: true,
      collected_at,
      ...metrics,
    })
    .eq('orb_id', orbId);
  if (error) {
    console.error('markCameraOrbCollected', error);
  }
}

export async function invokeModule2AbandonSession(sessionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke(MODULE_2_EDGE_FUNCTION, {
    body: { session_id: sessionId, action: 'abandon' },
  });
  if (error) {
    console.error('invokeModule2AbandonSession', error);
  }
}

export async function invokeModule2CompleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke(MODULE_2_EDGE_FUNCTION, {
    body: { session_id: sessionId, action: 'complete' },
  });
  if (error) {
    console.error('invokeModule2CompleteSession', error);
  }
}
