import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
  endTime: string;
  compact?: boolean;
}

function getTimeRemaining(endTime: string) {
  const total = new Date(endTime).getTime() - Date.now();
  if (total <= 0) return null;

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function CountdownTimer({ endTime, compact = false }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(endTime));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(getTimeRemaining(endTime));

    intervalRef.current = setInterval(() => {
      const r = getTimeRemaining(endTime);
      setRemaining(r);
      if (!r && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endTime]);

  if (!remaining) {
    return <Text style={[styles.ended, compact && styles.compact]}>Ended</Text>;
  }

  const isUrgent = remaining.total < 60 * 60 * 1000; // less than 1 hour

  if (compact) {
    if (remaining.days > 0) {
      return (
        <Text style={[styles.timer, styles.compact]}>
          {remaining.days}d {pad(remaining.hours)}h
        </Text>
      );
    }
    if (remaining.hours > 0) {
      return (
        <Text style={[styles.timer, styles.compact, isUrgent && styles.urgent]}>
          {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
        </Text>
      );
    }
    return (
      <Text style={[styles.timer, styles.compact, styles.urgent]}>
        {pad(remaining.minutes)}:{pad(remaining.seconds)}
      </Text>
    );
  }

  if (remaining.days > 0) {
    return (
      <Text style={styles.timer}>
        {remaining.days}d {pad(remaining.hours)}h {pad(remaining.minutes)}m
      </Text>
    );
  }

  return (
    <Text style={[styles.timer, isUrgent && styles.urgent]}>
      {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '600',
  },
  compact: {
    fontSize: 11,
  },
  urgent: {
    color: '#e94560',
  },
  ended: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
  },
});
