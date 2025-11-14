function parseTimeString(timeStr: string): Date {
  const trimmed = timeStr.trim().toLowerCase();

  // Extract AM/PM
  const isPM = trimmed.includes("pm");
  const isAM = trimmed.includes("am");

  // Remove AM/PM
  const clean = trimmed.replace(/am|pm/g, "").trim();

  // Split into parts
  const [hStr, mStr, sStr] = clean.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const s = Number(sStr);

  // Convert 12-hour → 24-hour
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;

  const d = new Date();
  d.setHours(h);
  d.setMinutes(m);
  d.setSeconds(s);
  d.setMilliseconds(0);

  return d;
}

// check if the data is expired
export function isDataExpired(expTime: string): boolean {
  const currentTime = new Date().toLocaleTimeString("en-IN", { timeZone: 'Asia/Kolkata' })
  const current = parseTimeString(currentTime);
  const exp = parseTimeString(expTime);
  // expired if current > exp
  return current.getTime() > exp.getTime()
}