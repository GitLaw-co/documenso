import { AppError, AppErrorCode } from './app-error';

export const isNotFoundError = (error: unknown) => AppError.parseError(error).code === AppErrorCode.NOT_FOUND;
