import React from "react";
import * as D from "./domain";
export type Modal = {
  title: string;
  body: React.ReactNode;
  action?: () => Promise<unknown> | unknown;
  variant?: "dialog" | "drawer";
  label?: string;
  danger?: boolean;
  cancel?: () => void;
};
export type Context = {
  user: D.Account;
  full: boolean;
  modal: (m: Modal | null) => void;
  act: (fn: () => Promise<unknown> | unknown) => Promise<void>;
};
