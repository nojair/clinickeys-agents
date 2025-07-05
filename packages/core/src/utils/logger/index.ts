// packages/core/src/utils/logger/index.ts

import util from 'util';

export const logger = {
  info: (...args: any) => {
    const inspectedArgs = args.map((arg: any) =>
      typeof arg === 'object'
        ? util.inspect(arg, { depth: null, colors: false })
        : arg
    );
    console.log('[INFO]', ...inspectedArgs);
  },
  error: (...args: any) => {
    const inspectedArgs = args.map((arg: any) =>
      typeof arg === 'object'
        ? util.inspect(arg, { depth: null, colors: false })
        : arg
    );
    console.error('[ERROR]', ...inspectedArgs);
  },
  warn: (...args: any) => {
    const inspectedArgs = args.map((arg: any) =>
      typeof arg === 'object'
        ? util.inspect(arg, { depth: null, colors: false })
        : arg
    );
    console.warn('[ERROR]', ...inspectedArgs);
  },
};
