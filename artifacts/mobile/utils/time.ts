export function getNextTargetTime(
  interval: number, 
  activeStart: number, 
  activeEnd: number
): number {
  const now = new Date();
  const msInMin = 60 * 1000;
  const intervalMs = interval * msInMin;

  const startOfDay = new Date(now);
  startOfDay.setHours(activeStart, 0, 0, 0);

  if (now.getTime() < startOfDay.getTime()) {
    return startOfDay.getTime();
  }

  const elapsedMs = now.getTime() - startOfDay.getTime();
  let nextMs = startOfDay.getTime() + Math.ceil(elapsedMs / intervalMs) * intervalMs;
  
  if (nextMs === now.getTime()) {
    nextMs += intervalMs;
  }

  const next = new Date(nextMs);
  if (next.getHours() >= activeEnd) {
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    tmrw.setHours(activeStart, 0, 0, 0);
    return tmrw.getTime();
  }

  return nextMs;
}
