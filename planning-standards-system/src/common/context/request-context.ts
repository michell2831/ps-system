import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
    /** Original ARMS role (SUPER_ADMIN/SUBSYSTEM_ADMIN/STAFF/OPCR_EVALUATOR) — from x-arms-role */
    actorRole?: string;
    /** ARMS username — from x-actor-username */
    actorUsername?: string;
    /** Actor ID — from x-actor-id */
    actorId?: string;
    /** Real client IP — from x-client-ip (set by gateway's ForwardedIpInterceptor) */
    clientIp?: string;
    /** Requesting user's office — from x-office */
    office?: string;
    /** Whether the user has cross-office access (SUPER_ADMIN/OPCR_EVALUATOR) — from x-is-cross-office */
    isCrossOffice?: boolean;
}

const storage = new AsyncLocalStorage<RequestContextData>();

/**
 * Request-scoped context, populated by RequestContextMiddleware on every
 * incoming request. Lets deeply-nested service methods (e.g. logAudit
 * helpers, cross-service HTTP calls) read actor role/username/IP/office
 * for Kafka audit events and downstream service calls WITHOUT threading
 * these values through every method signature.
 */
export const RequestContext = {
    run<T>(data: RequestContextData, fn: () => T): T {
        return storage.run(data, fn);
    },
    get(): RequestContextData | undefined {
        return storage.getStore();
    },
};

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        RequestContext.run(
            {
                actorRole: (req.headers['x-arms-role'] as string) || (req.headers['x-role'] as string) || undefined,
                actorUsername: (req.headers['x-actor-username'] as string) || undefined,
                actorId: (req.headers['x-actor-id'] as string) || undefined,
                clientIp: (req.headers['x-client-ip'] as string) || undefined,
                office: (req.headers['x-office'] as string) || undefined,
                isCrossOffice: req.headers['x-is-cross-office'] === 'true',
            },
            () => next(),
        );
    }
}