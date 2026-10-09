// Dates in Houston time (US Central), the market the app serves.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}
