/* @flow */

export type Logger = {
  pretty: boolean,
  clear: () => void,
  log: (type: string, title: string, ...args: any[]) => void,
  print: (...args: any[]) => void,
  printCommandInfo: () => void,
  fatal: (...args: any[]) => void,
  resetLine: () => void,
  level?: string,
  success: (...args: any[]) => void,
  info: (...args: any[]) => void,
  warn: (...args: any[]) => void,
  debug: (...args: any[]) => void,
  error: (...args: any[]) => void,
};

export type ColorScheme = {
  success: (...args: any[]) => void,
  info: (...args: any[]) => void,
  warn: (...args: any[]) => void,
  debug: (...args: any[]) => void,
  error: (...args: any[]) => void,
  filename: (...args: any[]) => void,
  highlight: (...args: any[]) => void,
  compilation: (...args: any[]) => void,
};
