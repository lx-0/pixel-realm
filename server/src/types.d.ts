// Ambient declarations for packages without bundled type declarations.
// Used when @types/* packages are unavailable in the build environment.

declare module "express" {
  import { IncomingMessage, ServerResponse, Server } from "http";

  export interface Request extends IncomingMessage {
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body: unknown;
    path: string;
  }

  export interface Response extends ServerResponse<IncomingMessage> {
    json(body: unknown): this;
    send(body: string | Buffer | object): this;
    status(code: number): this;
    set(field: string, value: string): this;
  }

  export type NextFunction = (err?: unknown) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

  export interface IRouter {
    use(...handlers: RequestHandler[]): this;
    use(path: string, ...handlers: RequestHandler[]): this;
    get(path: string, ...handlers: ((req: Request, res: Response) => void)[]): this;
    post(path: string, ...handlers: ((req: Request, res: Response) => void)[]): this;
  }

  export interface Application extends IRouter {
    (req: IncomingMessage, res: ServerResponse): void;
    listen(port: number, cb?: () => void): Server;
  }

  function e(): Application;
  namespace e {
    function json(): RequestHandler;
  }
  export = e;
}

declare module "cors" {
  import { RequestHandler } from "express";
  function cors(options?: Record<string, unknown>): RequestHandler;
  export = cors;
}
