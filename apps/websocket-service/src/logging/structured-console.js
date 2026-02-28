import util from 'util';

const METHOD_LEVEL_MAP = {
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

const RESERVED_CONTEXT_KEYS = new Set([
  'level',
  'message',
  'timestamp',
  'service',
  'environment',
  'pid',
  'correlation_id',
  'context',
  'error',
]);

let isInstalled = false;

function safeSerialize(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return `[Function:${value.name || 'anonymous'}]`;
  }
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return util.inspect(value, { depth: 3, breakLength: 120, compact: true });
  }
}

function extractCorrelationId(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  if (typeof candidate.correlationId === 'string' && candidate.correlationId) {
    return candidate.correlationId;
  }
  if (typeof candidate.corr_id === 'string' && candidate.corr_id) {
    return candidate.corr_id;
  }
  if (candidate.data && typeof candidate.data === 'object') {
    if (typeof candidate.data.correlationId === 'string' && candidate.data.correlationId) {
      return candidate.data.correlationId;
    }
    if (typeof candidate.data.corr_id === 'string' && candidate.data.corr_id) {
      return candidate.data.corr_id;
    }
  }
  if (candidate.headers && typeof candidate.headers === 'object') {
    const headerValue = candidate.headers['x-correlation-id'] || candidate.headers['X-Correlation-ID'];
    if (typeof headerValue === 'string' && headerValue) {
      return headerValue;
    }
  }
  return null;
}

function buildMessage(args) {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
      }
      if (typeof arg === 'object') {
        return util.inspect(arg, { depth: 2, breakLength: 120, compact: true });
      }
      return String(arg);
    })
    .join(' ');
}

function buildContext(args) {
  const context = {};
  for (const arg of args) {
    if (!arg || typeof arg !== 'object' || Array.isArray(arg) || arg instanceof Error) {
      continue;
    }
    for (const [key, value] of Object.entries(arg)) {
      if (RESERVED_CONTEXT_KEYS.has(key)) {
        continue;
      }
      context[key] = safeSerialize(value);
    }
  }
  return Object.keys(context).length > 0 ? context : null;
}

function getFirstError(args) {
  return args.find((arg) => arg instanceof Error) || null;
}

export function installStructuredConsoleLogging() {
  if (isInstalled || process.env.LOG_FORMAT !== 'json') {
    return;
  }
  isInstalled = true;

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  for (const method of Object.keys(METHOD_LEVEL_MAP)) {
    const level = METHOD_LEVEL_MAP[method];
    const sink = level === 'error' || level === 'warn' ? original.error : original.log;

    console[method] = (...args) => {
      const correlationId = args.map(extractCorrelationId).find(Boolean) || null;
      const context = buildContext(args);
      const error = getFirstError(args);

      const record = {
        timestamp: new Date().toISOString(),
        level,
        service: 'governsai-websocket',
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        message: buildMessage(args),
      };

      if (correlationId) {
        record.correlation_id = correlationId;
      }
      if (context) {
        record.context = context;
      }
      if (error) {
        record.error = safeSerialize(error);
      }

      sink(JSON.stringify(record));
    };
  }
}
