export interface IErrorSources {
  path: string;
  message: string;
}

export interface IErrorResponse {
  statusCode?: number;
  success: boolean;
  message: string;
  errorSources: IErrorSources[];
  stack?: string | undefined;
  error?: unknown;
}
