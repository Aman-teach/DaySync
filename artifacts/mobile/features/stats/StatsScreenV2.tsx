/**
 * StatsScreenV2.tsx
 *
 * Pure orchestration layer. This file contains ZERO business logic,
 * ZERO calculations, and ZERO data transformations.
 *
 * Responsibility: Connect domain hooks to presentation components.
 *
 * Dependency flow (one-directional, no reversals permitted):
 *   AppContext → Validation → Domain Hooks → StatsScreenV2 → Presentation
 */
import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

// Domain layer (frozen — do not modify)
import { validateStatsEntries } from './validation/statsValidation';
import { useStatsData } from './hooks/useStatsData';
import { useHeatmapData } from './hooks/useHeatmapData';
import { useTimeframeData } from './hooks/useTimeframeData';
import { useInsights } from './hooks/useInsights';
import { statsLogger } from './utils/statsLogger';

// Presentation layer (frozen — do not modify)
import { EmptyState } from './components/EmptyState';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { SectionFallback } from './components/SectionFallback';
import { OverviewHeader } from './components/OverviewHeader';
import { FocusMixSection } from './components/FocusMixSection';
import { DeepWorkHistogram } from './components/DeepWorkHistogram';
import { TaskAnalyticsSection } from './components/TaskAnalyticsSection';
import { DomainAnalyticsSection } from './components/DomainAnalyticsSection';
import { ActivityAnalyticsSection } from './components/ActivityAnalyticsSection';
import { HeatmapSection } from './components/HeatmapSection';
import { InsightsCard } from './components/InsightsCard';

// ---------------------------------------------------------------------------
// SectionBoundary
//
// Isolates each Stats section. If one section crashes (e.g. SVG rendering on
// a specific Android OEM), only that section falls back to <SectionFallback>.
// The remaining sections continue rendering normally.
//
// Uses a class component because React requires class components for error
// boundaries — functional components cannot implement componentDidCatch.
// ---------------------------------------------------------------------------
interface SectionBoundaryState { hasError: boolean }

class SectionBoundary extends React.Component<
  React.PropsWithChildren<{ sectionName: string }>,
  SectionBoundaryState
> {
  state: SectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Routed through centralized logger — swap backend without changing this file
    statsLogger.error('section', `${this.props.sectionName} crashed`, error);
  }

  render() {
    if (this.state.hasError) return <SectionFallback />;
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// StatsScreenV2
// ---------------------------------------------------------------------------
export default function StatsScreenV2() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // ── 1. Raw data from context ─────────────────────────────────────────────
  // AppContext guarantees entries is always Entry[] (never undefined).
  // During the initial hydration pass it will be an empty array, which the
  // empty-state guard below handles safely.
  const { entries: rawEntries, settings, domains } = useApp();

  // ── 2. Validation boundary ───────────────────────────────────────────────
  // validateStatsEntries strips every corrupt/unrecoverable entry exactly
  // once, at the outermost boundary of the Stats domain. All subsequent
  // hooks receive a mathematically guaranteed-safe array.
  const entries = React.useMemo(
    () => validateStatsEntries(rawEntries),
    [rawEntries]
  );

  // ── 3. Domain hooks ──────────────────────────────────────────────────────
  // Every calculation lives inside these hooks.
  // This screen destructures their outputs — it performs no math itself.
  const {
    todayScore,
    yesterdayScore,
    wasteDelta,
    ringSegments,
    allTotal,
    allDeep,
    streak,
    deepRate,           // ← owned by useStatsData, not derived here
    deepByHour,
    maxDeepByHour,
    hasYesterdayData,   // ← owned by useStatsData, not derived here
    hasTodayData,       // ← owned by useStatsData, not derived here
    todayEntries,
    yesterdayEntries,
  } = useStatsData(entries, settings.dayStartHour);

  const heatmapData = useHeatmapData(entries, settings.dayStartHour);

  const {
    taskTimeframe, setTaskTimeframe, taskBreakdown, maxTaskMin,
    domainTimeframe, setDomainTimeframe, domainMinutes, maxDomainMin,
    activityTimeframe, setActivityTimeframe, activityMinutes, maxActivityMin,
  } = useTimeframeData(entries, todayEntries, yesterdayEntries);

  const insights = useInsights(entries, allTotal, allDeep, streak, domains);

  // ── 4. Layout constants ──────────────────────────────────────────────────
  // These are platform offsets for safe-area, not business logic.
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100;

  // ── 5. Loading / Empty guards ────────────────────────────────────────────
  // All hooks have been called above — guards appear here to respect the
  // Rules of Hooks (no conditional hook calls).
  // The loading skeleton is shown during the brief window where entries is
  // empty because AsyncStorage hasn't resolved yet.
  if (entries.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState topPadding={topPad + 40} />
      </View>
    );
  }

  // ── 6. Main render ───────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SectionBoundary sectionName="OverviewHeader">
          <OverviewHeader
            todayScore={todayScore}
            yesterdayScore={yesterdayScore}
            wasteDelta={wasteDelta}
            hasYesterdayData={hasYesterdayData}
            hasTodayData={hasTodayData}
          />
        </SectionBoundary>

        <SectionBoundary sectionName="FocusMixSection">
          <FocusMixSection
            ringSegments={ringSegments}
            allTotal={allTotal}
            streak={streak}
            deepRate={deepRate}
          />
        </SectionBoundary>

        <SectionBoundary sectionName="DeepWorkHistogram">
          <DeepWorkHistogram
            hourlyData={deepByHour}
            maxDeepByHour={maxDeepByHour}
            activeStart={settings.activeStart}
            activeEnd={settings.activeEnd}
          />
        </SectionBoundary>

        <SectionBoundary sectionName="DomainAnalyticsSection">
          <DomainAnalyticsSection
            data={domainMinutes}
            maxMinutes={maxDomainMin}
            selectedTimeframe={domainTimeframe}
            onTimeframeChange={setDomainTimeframe}
          />
        </SectionBoundary>

        <SectionBoundary sectionName="ActivityAnalyticsSection">
          <ActivityAnalyticsSection
            data={activityMinutes}
            maxMinutes={maxActivityMin}
            selectedTimeframe={activityTimeframe}
            onTimeframeChange={setActivityTimeframe}
          />
        </SectionBoundary>

        <SectionBoundary sectionName="TaskAnalyticsSection">
          <TaskAnalyticsSection
            data={taskBreakdown}
            maxMinutes={maxTaskMin}
            selectedTimeframe={taskTimeframe}
            onTimeframeChange={setTaskTimeframe}
          />
        </SectionBoundary>

        <SectionBoundary sectionName="HeatmapSection">
          <HeatmapSection heatmapData={heatmapData} dayStartHour={settings.dayStartHour} />
        </SectionBoundary>

        <SectionBoundary sectionName="InsightsCard">
          <InsightsCard insights={insights} />
        </SectionBoundary>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 14 },
});
