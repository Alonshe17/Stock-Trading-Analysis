export type PriceAlert = {
  id: string;
  symbol: string;
  name: string;
  highTarget: number | null;  // alert when price >= this
  lowTarget: number | null;   // alert when price <= this
  createdAt: number;
  triggeredHigh: boolean;
  triggeredLow: boolean;
  active: boolean;
};

const STORAGE_KEY = 'swingmonitor_alerts';

export function getAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: PriceAlert[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    return true;
  } catch {
    return false;
  }
}

export function upsertAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredHigh' | 'triggeredLow' | 'active'>): boolean {
  const alerts = getAlerts();
  const existing = alerts.findIndex((a) => a.symbol === alert.symbol);
  if (existing >= 0) {
    alerts[existing] = {
      ...alerts[existing],
      highTarget: alert.highTarget,
      lowTarget: alert.lowTarget,
      triggeredHigh: false,  // always re-arm so monitoring continues
      triggeredLow: false,
      active: true,
    };
  } else {
    alerts.push({
      ...alert,
      id: `${alert.symbol}-${Date.now()}`,
      createdAt: Date.now(),
      triggeredHigh: false,
      triggeredLow: false,
      active: true,
    });
  }
  return saveAlerts(alerts);
}

export function removeAlert(symbol: string): void {
  saveAlerts(getAlerts().filter((a) => a.symbol !== symbol));
}

export function getAlert(symbol: string): PriceAlert | null {
  return getAlerts().find((a) => a.symbol === symbol) ?? null;
}

export function markTriggered(symbol: string, side: 'high' | 'low'): void {
  const alerts = getAlerts();
  const idx = alerts.findIndex((a) => a.symbol === symbol);
  if (idx >= 0) {
    if (side === 'high') alerts[idx].triggeredHigh = true;
    if (side === 'low') alerts[idx].triggeredLow = true;
    saveAlerts(alerts);
  }
}
