import { Platform } from 'react-native';
import { Entry } from '@/types';

export async function exportToCSV(entries: Entry[]): Promise<void> {
  const header = 'id,date,time,text,tags,focus,energy,interval_minutes\n';
  const rows = entries.map(e => {
    const date = e.dateKey;
    const time = new Date(e.createdAt).toLocaleTimeString();
    const text = `"${e.text.replace(/"/g, '""')}"`;
    const tags = `"${e.tags.join(', ')}"`;
    return [e.id, date, time, text, tags, e.focus, e.energy, e.intervalMinutes].join(',');
  });
  const csv = header + rows.join('\n');

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-cadence-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const path = `${FileSystem.documentDirectory}atlas-cadence-export.csv`;
  await FileSystem.writeAsStringAsync(path, csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Atlas Cadence Data',
    });
  }
}
