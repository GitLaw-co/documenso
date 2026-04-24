import { type TransportTargetOptions, pino } from 'pino';

import type { BaseApiLog } from '../types/api-logs';
import { extractRequestMetadata } from '../universal/extract-request-metadata';
import { env } from './env';

const transports: TransportTargetOptions[] = [];

if (env('NODE_ENV') !== 'production' && !env('INTERNAL_FORCE_JSON_LOGGER')) {
  transports.push({
    target: 'pino-pretty',
    level: 'info',
  });
}

const loggingFilePath = env('NEXT_PRIVATE_LOGGER_FILE_PATH');

if (loggingFilePath) {
  transports.push({
    target: 'pino/file',
    level: 'info',
    options: {
      destination: loggingFilePath,
      mkdir: true,
    },
  });
}

export const logger = pino({
  level: 'info',
  redact: {
    paths: [
      'authorization',
      'Authorization',
      '*.authorization',
      '*.Authorization',
      'req.headers.authorization',
      'req.headers.Authorization',
      'request.headers.authorization',
      'request.headers.Authorization',
      'headers.authorization',
      'headers.Authorization',
    ],
    censor: '[REDACTED]',
  },
  transport:
    transports.length > 0
      ? {
          targets: transports,
        }
      : undefined,
});

export const logDocumentAccess = ({
  request,
  documentId,
  userId,
}: {
  request: Request;
  documentId: number;
  userId: number;
}) => {
  const metadata = extractRequestMetadata(request);

  const data: BaseApiLog = {
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    path: new URL(request.url).pathname,
    auth: 'session',
    source: 'app',
    userId,
  };

  logger.info({
    ...data,
    input: {
      documentId,
    },
  });
};
