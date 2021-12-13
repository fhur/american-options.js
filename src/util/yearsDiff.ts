export function yearsDiff(initDate: Date, finalDate: Date) {
  return (
    (finalDate.getTime() - initDate.getTime()) / (1000 * 60 * 60 * 24 * 364)
  );
}
