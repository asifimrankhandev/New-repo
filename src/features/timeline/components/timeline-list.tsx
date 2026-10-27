import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { StatusTag } from '@/components/ui/status-tag';
import { formatShortDate } from '@/domain/dates';
import { eventSource, eventType } from '@/domain/enums';
import type { TimelineEvent } from '@/domain/models';
import { formatCents } from '@/domain/money';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** Newest-first vertical timeline; every event shows who reported it. */
export function TimelineList({
  events,
  caseId,
}: {
  events: readonly TimelineEvent[];
  caseId: string;
}) {
  const { colors } = useTheme();
  return (
    <View>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const label = eventType.labels[event.type];
        const date = formatShortDate(new Date(event.occurredAt)).toUpperCase();
        const editable = event.source !== 'system';
        return (
          <Pressable
            key={event.id}
            disabled={!editable}
            accessibilityRole={editable ? 'button' : undefined}
            accessibilityLabel={`${date}, ${label}, ${eventSource.labels[event.source]}${event.description ? `, ${event.description}` : ''}`}
            accessibilityHint={editable ? 'Edit or delete this event' : undefined}
            onPress={() =>
              router.push({
                pathname: '/case/[id]/add-event',
                params: { id: caseId, eventId: event.id },
              })
            }
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <AppText variant="label" tone="muted" style={styles.date}>
              {date}
            </AppText>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  isLast
                    ? { borderWidth: 1.5, borderColor: colors.ink }
                    : { backgroundColor: colors.ink },
                ]}
              />
              {!isLast ? <View style={[styles.line, { backgroundColor: colors.line }]} /> : null}
            </View>
            <View style={styles.body}>
              <AppText variant="bodyStrong">{label}</AppText>
              {event.description || event.amountCents !== null ? (
                <AppText variant="caption" tone="muted">
                  {[
                    event.amountCents !== null ? formatCents(event.amountCents) : null,
                    event.description,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              ) : null}
              <View style={styles.meta}>
                <StatusTag label={eventSource.labels[event.source]} tone="outline" />
                {event.editedAt ? (
                  <AppText variant="small" tone="faint">
                    Edited
                  </AppText>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 64 },
  date: { width: 58, paddingTop: 3, fontSize: 10.5 },
  rail: { width: 20, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  line: { width: 1, flex: 1, marginTop: spacing.xs },
  body: { flex: 1, paddingBottom: 18, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
});
