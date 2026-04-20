import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import module1AnalyticsStyles from '../pages/Module1Analytics.module.css';
import module2AnalyticsStyles from '../pages/Module2Analytics.module.css';
import module3AnalyticsStyles from '../pages/Module3Analytics.module.css';
import modalStyles from './TraineeModuleProgressModal.module.css';

export type TraineeModuleId = 1 | 2 | 3;

type ProgressPoint = {
  sessionLabel: string;
  completedAt: string;
  scorePct: number;
  completionSeconds: number | null;
};

type TooltipState = {
  visible: boolean;
  xPct: number;
  yPct: number;
  lines: string[];
};

type MotionPoint = { sessionLabel: string; completedAt: string; value: number };
type WasteBar = { sessionLabel: string; completedAt: string; overshootDistance: number };
type DropsBar = { sessionLabel: string; completedAt: string; drops: number };
type TransferByHand = {
  side: 'left' | 'right';
  completedCount: number;
  failedCount: number;
  completedPct: number;
  failedPct: number;
};

const MODULE_PERCENTILE_VIEWS: Record<TraineeModuleId, string> = {
  1: 'module1_department_percentile',
  2: 'module2_department_percentile',
  3: 'module3_department_percentile',
};

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return 'N/A';
  const totalSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatFastestLabel(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return '--';
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins > 0) {
    return `${mins} minute${mins === 1 ? '' : 's'}, ${secs} second${secs === 1 ? '' : 's'}`;
  }
  return `${secs} second${secs === 1 ? '' : 's'}`;
}

async function fetchHighestScore(traineeUserId: string, moduleId: TraineeModuleId): Promise<number | null> {
  const { data, error } = await supabase
    .from('trainee_best_scores')
    .select('best_score')
    .eq('user_id', traineeUserId)
    .eq('module_id', moduleId)
    .maybeSingle();

  if (error) {
    console.error('TraineeModuleProgressModal: highest score', error);
    return null;
  }
  if (data?.best_score === null || data?.best_score === undefined) return null;
  return data.best_score * 100;
}

async function fetchTopPercentile(
  moduleId: TraineeModuleId,
  traineeUserId: string,
  departmentId: string | null
): Promise<number | null> {
  const viewName = MODULE_PERCENTILE_VIEWS[moduleId];
  let query = supabase.from(viewName).select('score').eq('user_id', traineeUserId);
  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    return null;
  }
  if (data?.score === null || data?.score === undefined) return null;
  const raw = Number(data.score);
  const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  return Math.max(0, Math.min(100, pct));
}

async function fetchProgressPoints(traineeUserId: string, moduleId: TraineeModuleId): Promise<ProgressPoint[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', traineeUserId)
    .eq('module_id', moduleId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });

  if (sessionsError) {
    console.error('TraineeModuleProgressModal: sessions', sessionsError);
    return [];
  }

  const sessionIds = (sessions ?? []).map((s) => s.session_id as string);
  if (sessionIds.length === 0) return [];

  if (moduleId === 1) {
    const { data: pressureRows, error: pressureError } = await supabase
      .from('pressure_sessions')
      .select('session_id, score, duration_seconds')
      .in('session_id', sessionIds);
    if (pressureError) {
      console.error('TraineeModuleProgressModal: pressure_sessions', pressureError);
      return [];
    }
    const bySession = new Map(
      (pressureRows ?? []).map((row) => [
        row.session_id as string,
        { score: row.score as number | null, duration: row.duration_seconds as number | null },
      ])
    );
    return (sessions ?? [])
      .map((session) => {
        const sessionId = session.session_id as string;
        const match = bySession.get(sessionId);
        if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
        return {
          completedAt: session.completed_at as string,
          scorePct: Math.max(0, Math.min(100, match.score * 100)),
          completionSeconds: match.duration,
        };
      })
      .filter((p): p is Omit<ProgressPoint, 'sessionLabel'> => p !== null)
      .map((p, index) => ({
        ...p,
        sessionLabel: `Session ${index + 1}`,
      }));
  }

  if (moduleId === 2) {
    const { data: cameraRows, error: cameraError } = await supabase
      .from('camera_sessions')
      .select('session_id, score, time_to_completion')
      .in('session_id', sessionIds);
    if (cameraError) {
      console.error('TraineeModuleProgressModal: camera_sessions', cameraError);
      return [];
    }
    const bySession = new Map(
      (cameraRows ?? []).map((row) => [
        row.session_id as string,
        { score: row.score as number | null, duration: row.time_to_completion as number | null },
      ])
    );
    return (sessions ?? [])
      .map((session) => {
        const sessionId = session.session_id as string;
        const match = bySession.get(sessionId);
        if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
        return {
          completedAt: session.completed_at as string,
          scorePct: Math.max(0, Math.min(100, match.score * 100)),
          completionSeconds: match.duration,
        };
      })
      .filter((p): p is Omit<ProgressPoint, 'sessionLabel'> => p !== null)
      .map((p, index) => ({
        ...p,
        sessionLabel: `Session ${index + 1}`,
      }));
  }

  const { data: pegRows, error: pegError } = await supabase
    .from('peg_sessions')
    .select('session_id, score, time_to_completion')
    .in('session_id', sessionIds);
  if (pegError) {
    console.error('TraineeModuleProgressModal: peg_sessions', pegError);
    return [];
  }
  const bySession = new Map(
    (pegRows ?? []).map((row) => [
      row.session_id as string,
      { score: row.score as number | null, duration: row.time_to_completion as number | null },
    ])
  );
  return (sessions ?? [])
    .map((session) => {
      const sessionId = session.session_id as string;
      const match = bySession.get(sessionId);
      if (!match || match.score === null || match.score === undefined || !session.completed_at) return null;
      return {
        completedAt: session.completed_at as string,
        scorePct: Math.max(0, Math.min(100, match.score * 100)),
        completionSeconds: match.duration,
      };
    })
    .filter((p): p is Omit<ProgressPoint, 'sessionLabel'> => p !== null)
    .map((p, index) => ({
      ...p,
      sessionLabel: `Session ${index + 1}`,
    }));
}

function fastestSeconds(points: ProgressPoint[]): number | null {
  const durations = points.map((p) => p.completionSeconds).filter((s): s is number => s != null && !Number.isNaN(s));
  if (durations.length === 0) return null;
  return Math.min(...durations);
}

async function fetchModule2MotionData(traineeUserId: string): Promise<{ economyOfMotionPoints: MotionPoint[]; wastedMovementBars: WasteBar[] }> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', traineeUserId)
    .eq('module_id', 2)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });
  if (sessionsError) return { economyOfMotionPoints: [], wastedMovementBars: [] };

  const orderedSessions = (sessions ?? []).map((session, index) => ({
    sessionId: session.session_id as string,
    completedAt: session.completed_at as string,
    sessionLabel: `Session ${index + 1}`,
  }));
  const sessionIds = orderedSessions.map((session) => session.sessionId);
  if (sessionIds.length === 0) return { economyOfMotionPoints: [], wastedMovementBars: [] };

  const { data: cameraRows, error: cameraError } = await supabase
    .from('camera_sessions')
    .select('session_id, economy_of_motion, total_distance_traveled, optimal_distance')
    .in('session_id', sessionIds);
  if (cameraError) return { economyOfMotionPoints: [], wastedMovementBars: [] };

  const cameraBySession = new Map(
    (cameraRows ?? []).map((row) => [
      row.session_id as string,
      {
        economyOfMotion: row.economy_of_motion as number | null,
        totalDistanceTraveled: row.total_distance_traveled as number | null,
        optimalDistance: row.optimal_distance as number | null,
      },
    ])
  );

  const economyOfMotionPoints = orderedSessions
    .map((session) => {
      const match = cameraBySession.get(session.sessionId);
      if (!match || match.economyOfMotion === null || match.economyOfMotion === undefined) return null;
      return {
        sessionLabel: session.sessionLabel,
        completedAt: session.completedAt,
        value: Number(match.economyOfMotion),
      };
    })
    .filter((point): point is MotionPoint => point !== null);

  const wastedMovementBars = orderedSessions
    .map((session) => {
      const match = cameraBySession.get(session.sessionId);
      if (
        !match ||
        match.totalDistanceTraveled === null ||
        match.totalDistanceTraveled === undefined ||
        match.optimalDistance === null ||
        match.optimalDistance === undefined ||
        Number(match.optimalDistance) === 0
      ) {
        return null;
      }
      const overshootDistance = Number(match.totalDistanceTraveled) - Number(match.optimalDistance);
      return {
        sessionLabel: session.sessionLabel,
        completedAt: session.completedAt,
        overshootDistance,
      };
    })
    .filter((bar): bar is WasteBar => bar !== null);

  return { economyOfMotionPoints, wastedMovementBars };
}

async function fetchModule3TransfersData(traineeUserId: string): Promise<{ dropsBars: DropsBar[]; overallTotalTransfers: number | null; transfersByHand: TransferByHand[] }> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('session_id, completed_at')
    .eq('user_id', traineeUserId)
    .eq('module_id', 3)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });
  if (sessionsError) return { dropsBars: [], overallTotalTransfers: null, transfersByHand: [] };

  const sessionIds = (sessions ?? []).map((session) => session.session_id as string);
  if (sessionIds.length === 0) return { dropsBars: [], overallTotalTransfers: null, transfersByHand: [] };

  const { data: pegRows, error: pegError } = await supabase
    .from('peg_sessions')
    .select('session_id, total_drops, total_transfers')
    .in('session_id', sessionIds);
  if (pegError) return { dropsBars: [], overallTotalTransfers: null, transfersByHand: [] };

  const pegBySession = new Map(
    (pegRows ?? []).map((row) => [
      row.session_id as string,
      {
        totalDrops: row.total_drops as number | null,
      },
    ])
  );

  const dropsBars: DropsBar[] = [];
  let completedDropsIndex = 0;
  for (const session of sessions ?? []) {
    const sessionId = session.session_id as string;
    const match = pegBySession.get(sessionId);
    if (!match || match.totalDrops === null || match.totalDrops === undefined || !session.completed_at) continue;
    completedDropsIndex += 1;
    dropsBars.push({
      sessionLabel: `Session ${completedDropsIndex}`,
      completedAt: session.completed_at as string,
      drops: Number(match.totalDrops),
    });
  }

  const overallTotalTransfers = (pegRows ?? [])
    .map((row) => row.total_transfers)
    .filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(Number(v)))
    .map((v) => Number(v))
    .reduce((sum, v) => sum + v, 0);

  const { data: pegTransfersRows, error: pegTransfersError } = await supabase
    .from('peg_transfers')
    .select('from_side, is_completed')
    .in('session_id', sessionIds);
  if (pegTransfersError) {
    return { dropsBars, overallTotalTransfers, transfersByHand: [] };
  }

  const sideCounts: Record<'left' | 'right', { completed: number; failed: number }> = {
    left: { completed: 0, failed: 0 },
    right: { completed: 0, failed: 0 },
  };

  for (const row of pegTransfersRows ?? []) {
    const sideRaw = (row.from_side as string | null | undefined)?.toLowerCase?.() ?? '';
    const side: 'left' | 'right' = sideRaw.includes('right') ? 'right' : 'left';
    if (row.is_completed === true) sideCounts[side].completed += 1;
    else if (row.is_completed === false) sideCounts[side].failed += 1;
  }

  const transfersByHand: TransferByHand[] = (['left', 'right'] as const).map((side) => {
    const completedCount = sideCounts[side].completed;
    const failedCount = sideCounts[side].failed;
    const den = overallTotalTransfers > 0 ? overallTotalTransfers : 0;
    const completedPct = den > 0 ? (completedCount / den) * 100 : 0;
    const failedPct = den > 0 ? (failedCount / den) * 100 : 0;
    return { side, completedCount, failedCount, completedPct, failedPct };
  });

  return { dropsBars, overallTotalTransfers, transfersByHand };
}

export interface TraineeModuleProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeUserId: string;
  displayName: string;
  moduleId: TraineeModuleId;
  departmentId: string | null;
}

const TraineeModuleProgressModal: React.FC<TraineeModuleProgressModalProps> = ({
  isOpen,
  onClose,
  traineeUserId,
  displayName,
  moduleId,
  departmentId,
}) => {
  const analyticsStyles =
    moduleId === 1 ? module1AnalyticsStyles : moduleId === 2 ? module2AnalyticsStyles : module3AnalyticsStyles;
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [topPercent, setTopPercent] = useState<number | null>(null);
  const [progressPoints, setProgressPoints] = useState<ProgressPoint[]>([]);
  const [economyOfMotionPoints, setEconomyOfMotionPoints] = useState<MotionPoint[]>([]);
  const [wastedMovementBars, setWastedMovementBars] = useState<WasteBar[]>([]);
  const [dropsBars, setDropsBars] = useState<DropsBar[]>([]);
  const [overallTotalTransfers, setOverallTotalTransfers] = useState<number | null>(null);
  const [transfersByHand, setTransfersByHand] = useState<TransferByHand[]>([]);
  const [economyInfoVisible, setEconomyInfoVisible] = useState(false);
  const [wasteInfoVisible, setWasteInfoVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressTooltip, setProgressTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 0,
    yPct: 0,
    lines: [],
  });
  const [economyTooltip, setEconomyTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });
  const [wasteTooltip, setWasteTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });
  const [dropsTooltip, setDropsTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });
  const [transferTooltip, setTransferTooltip] = useState<TooltipState>({
    visible: false,
    xPct: 50,
    yPct: 50,
    lines: [],
  });

  const loadData = useCallback(async () => {
    if (!traineeUserId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [best, top, points] = await Promise.all([
        fetchHighestScore(traineeUserId, moduleId),
        fetchTopPercentile(moduleId, traineeUserId, departmentId),
        fetchProgressPoints(traineeUserId, moduleId),
      ]);
      setHighestScore(best);
      setTopPercent(top);
      setProgressPoints(points);
      if (moduleId === 2) {
        const motion = await fetchModule2MotionData(traineeUserId);
        setEconomyOfMotionPoints(motion.economyOfMotionPoints);
        setWastedMovementBars(motion.wastedMovementBars);
        setDropsBars([]);
        setOverallTotalTransfers(null);
        setTransfersByHand([]);
      } else if (moduleId === 3) {
        const transfers = await fetchModule3TransfersData(traineeUserId);
        setDropsBars(transfers.dropsBars);
        setOverallTotalTransfers(transfers.overallTotalTransfers);
        setTransfersByHand(transfers.transfersByHand);
        setEconomyOfMotionPoints([]);
        setWastedMovementBars([]);
      } else {
        setEconomyOfMotionPoints([]);
        setWastedMovementBars([]);
        setDropsBars([]);
        setOverallTotalTransfers(null);
        setTransfersByHand([]);
      }
    } catch (e) {
      console.error(e);
      setLoadError('Could not load progress for this trainee.');
    } finally {
      setIsLoading(false);
    }
  }, [traineeUserId, moduleId, departmentId]);

  useEffect(() => {
    if (!isOpen || !traineeUserId) return;
    void loadData();
  }, [isOpen, traineeUserId, loadData]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const chartWidth = 420;
  const chartHeight = 240;
  const padding = { top: 20, right: 20, bottom: 28, left: 36 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const scoreMin = 0;
  const scoreMax = 100;
  const progressCount = progressPoints.length;
  const xScaleByIndex = (i: number) => {
    if (progressCount <= 1) {
      return padding.left + innerWidth / 2;
    }
    return padding.left + (i / (progressCount - 1)) * innerWidth;
  };
  const yScale = (s: number) => padding.top + innerHeight - ((s - scoreMin) / (scoreMax - scoreMin)) * innerHeight;
  const plottedPoints = progressPoints.map((point, i) => ({
    ...point,
    x: xScaleByIndex(i),
    y: yScale(point.scorePct),
  }));
  const points = plottedPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const axisStroke = 'rgba(255,255,255,0.5)';
  const x1 = padding.left;
  const y1 = padding.top + innerHeight;
  const x2 = padding.left + innerWidth;
  const y2 = padding.top;
  const timeLabelX = padding.left - 16;
  const timeLabelY = padding.top + innerHeight / 2;
  const scoreLabelX = padding.left + innerWidth / 2;
  const scoreLabelY = chartHeight - 8;
  const sessionTickLabelY = chartHeight - 12;
  const normalizedHighestScore = Math.max(0, Math.min(100, highestScore ?? 0));

  const fastest = moduleId === 1 ? null : fastestSeconds(progressPoints);
  const chartHeightModule23 = 248;
  const scoreLabelYModule23 = chartHeightModule23 - 4;
  const sessionTickLabelYModule23 = chartHeightModule23 - 20;

  const motionChartWidth = 420;
  const motionChartHeight = 228;
  const motionPadding = { top: 16, right: 16, bottom: 38, left: 42 };
  const motionInnerWidth = motionChartWidth - motionPadding.left - motionPadding.right;
  const motionInnerHeight = motionChartHeight - motionPadding.top - motionPadding.bottom;
  const motionCount = economyOfMotionPoints.length;
  const motionXScaleByIndex = (i: number) => {
    if (motionCount <= 1) return motionPadding.left + motionInnerWidth / 2;
    return motionPadding.left + (i / (motionCount - 1)) * motionInnerWidth;
  };
  const motionValues = economyOfMotionPoints.map((point) => point.value);
  const motionMinValueRaw = motionValues.length > 0 ? Math.min(...motionValues) : 0;
  const motionMaxValueRaw = motionValues.length > 0 ? Math.max(...motionValues) : 1;
  const motionMinValue = Math.min(0, motionMinValueRaw);
  const motionMaxValue = Math.max(1, motionMaxValueRaw);
  const motionYScale = (v: number) =>
    motionPadding.top +
    motionInnerHeight -
    ((v - motionMinValue) / Math.max(0.0001, motionMaxValue - motionMinValue)) * motionInnerHeight;
  const plottedMotionPoints = economyOfMotionPoints.map((point, i) => ({
    ...point,
    x: motionXScaleByIndex(i),
    y: motionYScale(point.value),
  }));
  const motionLinePoints = plottedMotionPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const motionX1 = motionPadding.left;
  const motionY1 = motionPadding.top + motionInnerHeight;
  const motionX2 = motionPadding.left + motionInnerWidth;
  const motionY2 = motionPadding.top;
  const motionSessionTickLabelY = motionChartHeight - 22;
  const motionSessionAxisLabelY = motionChartHeight - 4;

  const barChartWidth = 420;
  const barChartHeight = 228;
  const barPadding = { top: 16, right: 16, bottom: 46, left: 48 };
  const barInnerWidth = barChartWidth - barPadding.left - barPadding.right;
  const barInnerHeight = barChartHeight - barPadding.top - barPadding.bottom;
  const wasteValues = wastedMovementBars.map((bar) => bar.overshootDistance);
  const wasteMin = wasteValues.length > 0 ? Math.min(0, ...wasteValues) : 0;
  const wasteMax = wasteValues.length > 0 ? Math.max(0, ...wasteValues) : 1;
  const wasteYScale = (v: number) =>
    barPadding.top + barInnerHeight - ((v - wasteMin) / Math.max(0.0001, wasteMax - wasteMin)) * barInnerHeight;
  const wasteZeroY = wasteYScale(0);
  const barCount = wastedMovementBars.length;
  const barGap = 10;
  const computedBarWidth = barCount > 0 ? Math.max(8, (barInnerWidth - barGap * Math.max(0, barCount - 1)) / barCount) : 20;
  const barSessionTickLabelY = barChartHeight - 20;
  const barSessionsAxisLabelY = barChartHeight - 4;

  const dropsChartWidth = 420;
  const dropsChartHeight = 220;
  const dropsPadding = { top: 16, right: 16, bottom: 38, left: 48 };
  const dropsInnerWidth = dropsChartWidth - dropsPadding.left - dropsPadding.right;
  const dropsInnerHeight = dropsChartHeight - dropsPadding.top - dropsPadding.bottom;
  const dropsMax = dropsBars.length > 0 ? Math.max(...dropsBars.map((b) => b.drops)) : 0;
  const dropsAxisMax = dropsMax <= 0 ? 1 : Math.max(dropsMax, Math.ceil(dropsMax / 5) * 5);
  const dropsBaselineY = dropsPadding.top + dropsInnerHeight;
  const dropsYScale = (v: number) => {
    const clamped = Math.max(0, Math.min(v, dropsAxisMax));
    return dropsBaselineY - (clamped / dropsAxisMax) * dropsInnerHeight;
  };
  const dropsYTicks = (() => {
    const max = Math.round(dropsAxisMax);
    if (max <= 12) return Array.from({ length: max + 1 }, (_, i) => i);
    const step = Math.max(1, Math.ceil(max / 6));
    const ticks: number[] = [];
    for (let v = 0; v < max; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== max) ticks.push(max);
    return ticks;
  })();
  const dropCount = dropsBars.length;
  const dropGap = 10;
  const dropBarWidth = dropCount > 0 ? Math.max(8, (dropsInnerWidth - dropGap * Math.max(0, dropCount - 1)) / dropCount) : 20;

  const transferChartWidth = 420;
  const transferChartHeight = 220;
  const transferPadding = { top: 16, right: 16, bottom: 38, left: 58 };
  const transferInnerWidth = transferChartWidth - transferPadding.left - transferPadding.right;
  const transferInnerHeight = transferChartHeight - transferPadding.top - transferPadding.bottom;
  const transferBaselineY = transferPadding.top + transferInnerHeight;
  const transferYScalePct = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return transferBaselineY - (clamped / 100) * transferInnerHeight;
  };
  const transferYTicks = [0, 25, 50, 75, 100];
  const transferCenterX = transferPadding.left + transferInnerWidth / 2;
  const transferHalfWidth = transferInnerWidth / 2;
  const transferCenterGap = 26;
  const transferOuterGap = 12;
  const transferWithinPairGap = 10;
  const transferPairSpan = transferHalfWidth - transferCenterGap / 2 - transferOuterGap;
  const transferBarWidth = Math.max(10, (transferPairSpan - transferWithinPairGap) / 2);
  const transfersLeft = transfersByHand.find((t) => t.side === 'left');
  const transfersRight = transfersByHand.find((t) => t.side === 'right');

  const ArrowLeftIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (!isOpen || !traineeUserId) {
    return null;
  }

  const modalContent = (
    <div
      className={modalStyles.overlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trainee-module-progress-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={analyticsStyles.pageHeaderRow} style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            className={analyticsStyles.navButton}
            aria-label="Close"
          >
            <ArrowLeftIcon />
          </button>
          <h1 id="trainee-module-progress-title" className={analyticsStyles.pageTitle}>
            Module {moduleId} Analytics
          </h1>
          <span style={{ width: 40, height: 40 }} aria-hidden />
        </div>

        {loadError && (
          <p style={{ color: '#fca5a5', marginBottom: '12px', fontSize: '14px' }}>{loadError}</p>
        )}
        {isLoading && !loadError && (
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '12px', fontSize: '14px' }}>Loading…</p>
        )}

        <div className={modalStyles.analyticsBody}>
          <div className={analyticsStyles.analyticsLayout}>
            <div className={analyticsStyles.topMetricsRow}>
              <div className={analyticsStyles.card}>
                <h2 className={analyticsStyles.cardTitle}>Highest Score</h2>
                <div className="relative flex items-center justify-center" style={{ width: '100px', height: '100px', margin: '0 auto' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90" style={{ display: 'block' }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#1DA5FF"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - normalizedHighestScore / 100)}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold" style={{ color: 'white' }}>
                    {highestScore !== null ? `${Math.round(normalizedHighestScore)}%` : '--'}
                  </span>
                </div>
              </div>

              <div className={`${analyticsStyles.card} ${analyticsStyles.topCard}`}>
                <h2 className={analyticsStyles.cardTitle}>Top</h2>
                <div className={analyticsStyles.topCardBody}>
                  <p className={analyticsStyles.cardValue}>
                    {topPercent !== null ? `${topPercent}%` : '--'}
                  </p>
                  <p className={analyticsStyles.cardSubtext}>of Department</p>
                </div>
              </div>

              <div className={analyticsStyles.card}>
                {moduleId === 1 ? (
                  <>
                    <h2 className={analyticsStyles.cardTitle}>Average Pressure Accuracy</h2>
                    <p className={analyticsStyles.cardValue}>16 psi</p>
                  </>
                ) : (
                  <>
                    <h2 className={analyticsStyles.cardTitle}>Fastest Time</h2>
                    <p className={analyticsStyles.cardValue}>{formatFastestLabel(fastest)}</p>
                  </>
                )}
              </div>
            </div>

            <div className={analyticsStyles.rightCard}>
              <h2 className={analyticsStyles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>
                {`${displayName}'s Progress`}
              </h2>
              <div className={analyticsStyles.chartWrapper}>
                {progressPoints.length === 0 ? (
                  <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    No completed sessions
                  </div>
                ) : (
                  <>
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${chartWidth} ${moduleId === 1 ? chartHeight : chartHeightModule23}`}
                      className={analyticsStyles.progressChart}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <line x1={x1} y1={y1} x2={x1} y2={y2} stroke={axisStroke} strokeWidth="1" />
                      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={axisStroke} strokeWidth="1" />
                      <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                      {plottedPoints.map((point, i) => (
                        <g key={i} className={analyticsStyles.chartNodeGroup}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="18"
                            className={analyticsStyles.chartNodeHit}
                            onMouseEnter={() =>
                              setProgressTooltip({
                                visible: true,
                                xPct: (point.x / chartWidth) * 100,
                                yPct: (point.y / (moduleId === 1 ? chartHeight : chartHeightModule23)) * 100,
                                lines: [
                                  `${point.sessionLabel}`,
                                  `Score: ${Math.round(point.scorePct)}%`,
                                  `Completion Time: ${formatDuration(point.completionSeconds)}`,
                                  `Completed: ${formatTimestamp(point.completedAt)}`,
                                ],
                              })
                            }
                            onMouseLeave={() => setProgressTooltip((prev) => ({ ...prev, visible: false }))}
                          />
                          <circle cx={point.x} cy={point.y} r="8" className={analyticsStyles.chartNode} />
                          <text
                            x={point.x}
                            y={moduleId === 1 ? sessionTickLabelY : sessionTickLabelYModule23}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.85)"
                            fontSize="10"
                          >
                            {point.sessionLabel.replace('Session ', 'S')}
                          </text>
                        </g>
                      ))}
                      <text x={timeLabelX} y={timeLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" transform={`rotate(-90, ${timeLabelX}, ${timeLabelY})`}>Score</text>
                      <text x={scoreLabelX} y={moduleId === 1 ? scoreLabelY : scoreLabelYModule23} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12">Session</text>
                    </svg>
                    {progressTooltip.visible && (
                      <div
                        className={analyticsStyles.chartTooltip}
                        style={{
                          left: `${progressTooltip.xPct}%`,
                          top: `max(8%, calc(${progressTooltip.yPct}% - 20px))`,
                        }}
                      >
                        {progressTooltip.lines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                        <div className={analyticsStyles.chartTooltipArrow} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {moduleId === 2 && (
              <div className={analyticsStyles.rightCard}>
                <h2 className={analyticsStyles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>
                  Motion Efficiency
                </h2>
                <div className={analyticsStyles.motionGrid}>
                  <div className={analyticsStyles.motionPanel}>
                    <div className={analyticsStyles.motionPanelTitleWrap}>
                      <h3 className={analyticsStyles.motionPanelTitle}>Economy of motion</h3>
                      <span
                        className={analyticsStyles.infoIcon}
                        aria-label="Economy of motion info"
                        onMouseEnter={() => setEconomyInfoVisible(true)}
                        onMouseLeave={() => setEconomyInfoVisible(false)}
                      >
                        i
                        {economyInfoVisible && (
                          <span className={analyticsStyles.chartTooltip} style={{ left: '50%', top: '-8px' }}>
                            <span>
                              Economy of motion refers to the efficiency of camera movement. It is computed by dividing
                              the optimal distance of camera travel by the distance the camera traveled.
                            </span>
                            <span style={{ display: 'block', marginTop: '10px' }}>
                              The closer to 1, the more efficient the motion.
                            </span>
                            <span className={analyticsStyles.chartTooltipArrow} />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={analyticsStyles.motionChartWrap}>
                      {plottedMotionPoints.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          No economy of motion data
                        </div>
                      ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${motionChartWidth} ${motionChartHeight}`} className={analyticsStyles.progressChart} preserveAspectRatio="xMidYMid meet">
                          <line x1={motionX1} y1={motionY1} x2={motionX1} y2={motionY2} stroke={axisStroke} strokeWidth="1" />
                          <line x1={motionX1} y1={motionY1} x2={motionX2} y2={motionY1} stroke={axisStroke} strokeWidth="1" />
                          <polyline fill="none" stroke="#1DA5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={motionLinePoints} />
                          {plottedMotionPoints.map((point, i) => (
                            <g key={i} className={analyticsStyles.chartNodeGroup}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="16"
                                className={analyticsStyles.chartNodeHit}
                                onMouseEnter={() =>
                                  setEconomyTooltip({
                                    visible: true,
                                    xPct: (point.x / motionChartWidth) * 100,
                                    yPct: (point.y / motionChartHeight) * 100,
                                    lines: [
                                      `${point.sessionLabel}`,
                                      `Economy of motion: ${point.value.toFixed(3)}`,
                                      `Completed: ${formatTimestamp(point.completedAt)}`,
                                    ],
                                  })
                                }
                                onMouseLeave={() => setEconomyTooltip((prev) => ({ ...prev, visible: false }))}
                              />
                              <circle cx={point.x} cy={point.y} r="7" className={analyticsStyles.chartNode} />
                              <text x={point.x} y={motionSessionTickLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="10">
                                {point.sessionLabel.replace('Session ', 'S')}
                              </text>
                            </g>
                          ))}
                          <text x={motionPadding.left - 16} y={motionPadding.top + motionInnerHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" transform={`rotate(-90, ${motionPadding.left - 16}, ${motionPadding.top + motionInnerHeight / 2})`}>Economy</text>
                          <text x={motionPadding.left + motionInnerWidth / 2} y={motionSessionAxisLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">Session</text>
                        </svg>
                      )}
                      {economyTooltip.visible && (
                        <div className={analyticsStyles.chartTooltip} style={{ left: `${economyTooltip.xPct}%`, top: `max(8%, calc(${economyTooltip.yPct}% - 18px))` }}>
                          {economyTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={analyticsStyles.chartTooltipArrow} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={analyticsStyles.motionPanel}>
                    <div className={analyticsStyles.motionPanelTitleWrap}>
                      <h3 className={analyticsStyles.motionPanelTitle}>Wasted movement (raw distance)</h3>
                      <span
                        className={analyticsStyles.infoIcon}
                        aria-label="Wasted movement info"
                        onMouseEnter={() => setWasteInfoVisible(true)}
                        onMouseLeave={() => setWasteInfoVisible(false)}
                      >
                        i
                        {wasteInfoVisible && (
                          <span className={analyticsStyles.chartTooltip} style={{ left: '50%', top: '-8px' }}>
                            <span>
                              Wasted movement is the difference between total distance traveled and optimal distance.
                            </span>
                            <span className={analyticsStyles.chartTooltipArrow} />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={analyticsStyles.motionChartWrap}>
                      {wastedMovementBars.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          No distance data
                        </div>
                      ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} className={analyticsStyles.progressChart} preserveAspectRatio="xMidYMid meet">
                          <line x1={barPadding.left} y1={barPadding.top} x2={barPadding.left} y2={barPadding.top + barInnerHeight} stroke={axisStroke} strokeWidth="1" />
                          <line x1={barPadding.left} y1={wasteZeroY} x2={barPadding.left + barInnerWidth} y2={wasteZeroY} stroke={axisStroke} strokeWidth="1" />
                          {wastedMovementBars.map((bar, i) => {
                            const x = barPadding.left + i * (computedBarWidth + barGap);
                            const y = wasteYScale(Math.max(0, bar.overshootDistance));
                            const yNeg = wasteYScale(Math.min(0, bar.overshootDistance));
                            const rectY = bar.overshootDistance >= 0 ? y : wasteZeroY;
                            const height = Math.abs(yNeg - y);
                            const labelX = x + computedBarWidth / 2;
                            return (
                              <g key={`${bar.sessionLabel}-${i}`} className={analyticsStyles.chartBarGroup}>
                                <rect x={x} y={rectY} width={computedBarWidth} height={Math.max(1, height)} fill="#1DA5FF" className={analyticsStyles.chartBarVisible} />
                                <rect
                                  x={x}
                                  y={rectY}
                                  width={computedBarWidth}
                                  height={Math.max(14, height)}
                                  fill="transparent"
                                  onMouseEnter={() =>
                                    setWasteTooltip({
                                      visible: true,
                                      xPct: ((x + computedBarWidth / 2) / barChartWidth) * 100,
                                      yPct: ((rectY + Math.max(8, height / 2)) / barChartHeight) * 100,
                                      lines: [
                                        `${bar.sessionLabel}`,
                                        `Overshoot distance: ${bar.overshootDistance.toFixed(2)}`,
                                        `Completed: ${formatTimestamp(bar.completedAt)}`,
                                      ],
                                    })
                                  }
                                  onMouseLeave={() => setWasteTooltip((prev) => ({ ...prev, visible: false }))}
                                />
                                <text x={labelX} y={barSessionTickLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="10">
                                  {bar.sessionLabel.replace('Session ', 'S')}
                                </text>
                              </g>
                            );
                          })}
                          <text x={barPadding.left - 24} y={barPadding.top + barInnerHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" transform={`rotate(-90, ${barPadding.left - 24}, ${barPadding.top + barInnerHeight / 2})`}>Distance</text>
                          <text x={barPadding.left + barInnerWidth / 2} y={barSessionsAxisLabelY} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">Sessions</text>
                        </svg>
                      )}
                      {wasteTooltip.visible && (
                        <div className={analyticsStyles.chartTooltip} style={{ left: `${wasteTooltip.xPct}%`, top: `max(8%, calc(${wasteTooltip.yPct}% - 18px))` }}>
                          {wasteTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={analyticsStyles.chartTooltipArrow} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {moduleId === 3 && (
              <div className={analyticsStyles.transfersCard}>
                <h2 className={analyticsStyles.cardTitle} style={{ marginBottom: '16px', width: '100%' }}>
                  Transfers
                </h2>
                <div className={analyticsStyles.transfersGrid}>
                  <div className={analyticsStyles.transfersPanel}>
                    <h3 className={analyticsStyles.transfersPanelChartTitle}>Drops per Session</h3>
                    <div className={analyticsStyles.transfersChartWrapper}>
                      {dropsBars.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          No drop data
                        </div>
                      ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${dropsChartWidth} ${dropsChartHeight}`} className={analyticsStyles.progressChart} preserveAspectRatio="xMidYMid meet">
                          {dropsYTicks.map((tick) => {
                            const ty = dropsYScale(tick);
                            return <line key={`drops-grid-${tick}`} x1={dropsPadding.left} y1={ty} x2={dropsPadding.left + dropsInnerWidth} y2={ty} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
                          })}
                          <line x1={dropsPadding.left} y1={dropsPadding.top} x2={dropsPadding.left} y2={dropsBaselineY} stroke={axisStroke} strokeWidth="1" />
                          <line x1={dropsPadding.left} y1={dropsBaselineY} x2={dropsPadding.left + dropsInnerWidth} y2={dropsBaselineY} stroke={axisStroke} strokeWidth="1" />
                          {dropsYTicks.map((tick) => {
                            const ty = dropsYScale(tick);
                            return <text key={`drops-tick-${tick}`} x={dropsPadding.left - 8} y={ty} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize="10">{tick}</text>;
                          })}
                          {dropsBars.map((bar, i) => {
                            const x = dropsPadding.left + i * (dropBarWidth + dropGap);
                            const y = dropsYScale(bar.drops);
                            const height = dropsBaselineY - y;
                            const tooltipX = x + dropBarWidth / 2;
                            return (
                              <g key={`${bar.sessionLabel}-${i}`}>
                                <rect
                                  x={x}
                                  y={y}
                                  width={dropBarWidth}
                                  height={Math.max(1, height)}
                                  fill="#1DA5FF"
                                  className={analyticsStyles.chartBarInteractive}
                                  onMouseEnter={() =>
                                    setDropsTooltip({
                                      visible: true,
                                      xPct: (tooltipX / dropsChartWidth) * 100,
                                      yPct: (y / dropsChartHeight) * 100,
                                      lines: [`Drops: ${bar.drops}`, `Completed: ${formatTimestamp(bar.completedAt)}`],
                                    })
                                  }
                                  onMouseLeave={() => setDropsTooltip((prev) => ({ ...prev, visible: false }))}
                                />
                                <text x={tooltipX} y={dropsChartHeight - 12} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="10">
                                  {bar.sessionLabel.replace('Session ', 'S')}
                                </text>
                              </g>
                            );
                          })}
                          <text x={dropsPadding.left - 28} y={dropsPadding.top + dropsInnerHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" transform={`rotate(-90, ${dropsPadding.left - 28}, ${dropsPadding.top + dropsInnerHeight / 2})`}>Drops</text>
                          <text x={dropsPadding.left + dropsInnerWidth / 2} y={dropsChartHeight - 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">Session</text>
                        </svg>
                      )}
                      {dropsTooltip.visible && (
                        <div className={analyticsStyles.chartTooltip} style={{ left: `${dropsTooltip.xPct}%`, top: `max(8%, calc(${dropsTooltip.yPct}% - 20px))` }}>
                          {dropsTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={analyticsStyles.chartTooltipArrow} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={analyticsStyles.transfersPanel}>
                    <h3 className={analyticsStyles.transfersPanelChartTitle}>Transfer Success by Hand</h3>
                    <div className={analyticsStyles.transfersRightHeader}>
                      Total transfers attempted: {overallTotalTransfers ?? '--'}
                    </div>
                    <div className={analyticsStyles.transfersChartWrapper}>
                      {overallTotalTransfers === null ? (
                        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          No transfer data
                        </div>
                      ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${transferChartWidth} ${transferChartHeight}`} className={analyticsStyles.progressChart} preserveAspectRatio="xMidYMid meet">
                          {transferYTicks.map((tick) => {
                            const ty = transferYScalePct(tick);
                            return <line key={`transfer-grid-${tick}`} x1={transferPadding.left} y1={ty} x2={transferPadding.left + transferInnerWidth} y2={ty} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
                          })}
                          <line x1={transferPadding.left} y1={transferPadding.top} x2={transferPadding.left} y2={transferBaselineY} stroke={axisStroke} strokeWidth="1" />
                          <line x1={transferPadding.left} y1={transferBaselineY} x2={transferPadding.left + transferInnerWidth} y2={transferBaselineY} stroke={axisStroke} strokeWidth="1" />
                          {transferYTicks.map((tick) => {
                            const ty = transferYScalePct(tick);
                            return <text key={`transfer-tick-${tick}`} x={transferPadding.left - 8} y={ty} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize="10">{tick}%</text>;
                          })}
                          <line x1={transferCenterX} y1={transferPadding.top + 8} x2={transferCenterX} y2={transferBaselineY} stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                          {(['left', 'right'] as const).map((side) => {
                            const t = side === 'left' ? transfersLeft : transfersRight;
                            const completedPct = t?.completedPct ?? 0;
                            const failedPct = t?.failedPct ?? 0;
                            const completedCount = t?.completedCount ?? 0;
                            const failedCount = t?.failedCount ?? 0;
                            const sideCenterX = side === 'left' ? transferPadding.left + transferHalfWidth / 2 : transferCenterX + transferHalfWidth / 2;
                            const pairWidth = transferBarWidth * 2 + transferWithinPairGap;
                            const pairStartX = sideCenterX - pairWidth / 2;
                            const completedX = pairStartX;
                            const failedX = completedX + transferBarWidth + transferWithinPairGap;
                            const completedY = transferYScalePct(completedPct);
                            const failedY = transferYScalePct(failedPct);
                            const completedHeight = transferBaselineY - completedY;
                            const failedHeight = transferBaselineY - failedY;
                            const completedTooltipX = completedX + transferBarWidth / 2;
                            const failedTooltipX = failedX + transferBarWidth / 2;
                            return (
                              <g key={side}>
                                <rect
                                  x={completedX}
                                  y={completedY}
                                  width={transferBarWidth}
                                  height={Math.max(1, completedHeight)}
                                  fill="#16a34a"
                                  className={analyticsStyles.chartBarInteractive}
                                  onMouseEnter={() =>
                                    setTransferTooltip({
                                      visible: true,
                                      xPct: (completedTooltipX / transferChartWidth) * 100,
                                      yPct: (completedY / transferChartHeight) * 100,
                                      lines: [`Completed transfers: ${completedCount}`, `Success: ${completedPct.toFixed(2)}%`, `Hand: ${side}`],
                                    })
                                  }
                                  onMouseLeave={() => setTransferTooltip((prev) => ({ ...prev, visible: false }))}
                                />
                                <rect
                                  x={failedX}
                                  y={failedY}
                                  width={transferBarWidth}
                                  height={Math.max(1, failedHeight)}
                                  fill="#dc2626"
                                  className={analyticsStyles.chartBarInteractive}
                                  onMouseEnter={() =>
                                    setTransferTooltip({
                                      visible: true,
                                      xPct: (failedTooltipX / transferChartWidth) * 100,
                                      yPct: (failedY / transferChartHeight) * 100,
                                      lines: [`Failed transfers: ${failedCount}`, `Failure: ${failedPct.toFixed(2)}%`, `Hand: ${side}`],
                                    })
                                  }
                                  onMouseLeave={() => setTransferTooltip((prev) => ({ ...prev, visible: false }))}
                                />
                              </g>
                            );
                          })}
                          <text x={transferPadding.left - 50} y={transferPadding.top + transferInnerHeight / 2} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" transform={`rotate(-90, ${transferPadding.left - 50}, ${transferPadding.top + transferInnerHeight / 2})`}>Percentage</text>
                          <text x={transferPadding.left + transferHalfWidth / 2} y={transferChartHeight - 12} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">{transfersLeft ? transfersLeft.side : 'left'}</text>
                          <text x={transferCenterX + transferHalfWidth / 2} y={transferChartHeight - 12} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11">{transfersRight ? transfersRight.side : 'right'}</text>
                        </svg>
                      )}
                      {transferTooltip.visible && (
                        <div className={analyticsStyles.chartTooltip} style={{ left: `${transferTooltip.xPct}%`, top: `max(8%, calc(${transferTooltip.yPct}% - 20px))` }}>
                          {transferTooltip.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                          <div className={analyticsStyles.chartTooltipArrow} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TraineeModuleProgressModal;
