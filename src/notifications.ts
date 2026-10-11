export type Notice = { message: string; tone: "success" | "error" | "info" };
let handler: (s: Notice) => void = () => {};
export function bindNotify(fn: (s: Notice) => void) {
  handler = fn;
}
export function notify(message: string, tone: Notice["tone"] = "success") {
  handler({ message, tone });
}
