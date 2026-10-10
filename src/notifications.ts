let handler: (s: string) => void = () => {};
export function bindNotify(fn: (s: string) => void) {
  handler = fn;
}
export function notify(message: string) {
  handler(message);
}
