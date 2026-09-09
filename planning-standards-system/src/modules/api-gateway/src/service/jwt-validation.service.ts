import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface ValidatedArmsUser {
    userId: string;
    username: string;
    displayName: string;
    office: string;
    departmentId?: string;
    armsRole: string;
    isCrossOffice: boolean;
}

export type JwtValidationMode = 'MOCK' | 'REAL';

/** Roles that read across all 3 pilot offices regardless of the office_id claim. */
const CROSS_OFFICE_ROLES = new Set([
    'SUPER_ADMIN',
    'PLANNING_OFFICER',
    'OPCR_EVALUATOR',
    'CAMPUS_DIRECTOR',
]);

/**
 * TT4 — ARMS Auth Preparation — JWT Validation Infrastructure.
 *
 * Two modes, switched purely by ARMS_MOCK_ENABLED:
 *  - MOCK: Sprint 4 TT6 behaviour (mock-token-<base64 claims>, dev only).
 *  - REAL: verifies a genuine ARMS-issued JWT LOCALLY using RS256 +
 *          ARMS_JWT_PUBLIC_KEY — no per-request network round-trip to ARMS.
 *          Claims schema documented in ARMS_JWT_CONTRACT.md.
 *
 * Activating real auth (PS023 / Story 8) is a config-only change:
 * set ARMS_MOCK_ENABLED=false and paste the RS256 public key.
 */
@Injectable()
export class JwtValidationService {
    constructor(private readonly config: ConfigService) {}

    get mode(): JwtValidationMode {
        return this.config.get<string>('ARMS_MOCK_ENABLED', 'true') === 'true' ? 'MOCK' : 'REAL';
    }

    async validate(authHeader: string | undefined): Promise<ValidatedArmsUser> {
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid Authorization header');
        }
        const token = authHeader.split(' ')[1];
        if (token.startsWith('mock-token-')) {
            return this.validateMock(token);
        }
        return this.mode === 'MOCK' ? this.validateMock(token) : this.validateReal(token);
    }

    // ── MOCK mode (Sprint 4 TT6 behaviour, unchanged + CampusDirector added) ──
    private validateMock(token: string): ValidatedArmsUser {
        if (!token?.startsWith('mock-token-')) {
            throw new UnauthorizedException(
                'MOCK mode active (ARMS_MOCK_ENABLED=true) — expected a mock-token-* value',
            );
        }
        const b64Part = token.slice('mock-token-'.length);

        let claims: Record<string, any>;
        try {
            claims = JSON.parse(Buffer.from(b64Part, 'base64').toString('utf-8'));
        } catch {
            const legacyRole = b64Part.toUpperCase();
            const legacyMap: Record<string, Record<string, any>> = {
                STAFF: { userId: 'mock-staff-id', username: 'mock_staff', displayName: 'Mock Staff', armsRole: 'STAFF', office: 'ACAD', isCrossOffice: false },
                SUBSYSTEM_ADMIN: { userId: 'mock-admin-id', username: 'mock_admin', displayName: 'Mock Admin', armsRole: 'SUBSYSTEM_ADMIN', office: 'ACAD', isCrossOffice: false },
                SUPER_ADMIN: { userId: 'mock-super-id', username: 'mock_super', displayName: 'Mock SuperAdmin', armsRole: 'SUPER_ADMIN', office: 'ALL', isCrossOffice: true },
                OPCR_EVALUATOR: { userId: 'mock-opcr-id', username: 'mock_opcr', displayName: 'Mock OPCR', armsRole: 'OPCR_EVALUATOR', office: 'ALL', isCrossOffice: true },
                PLANNING_OFFICER: { userId: 'mock-planner-id', username: 'mock_planner', displayName: 'Mock Planner', armsRole: 'PLANNING_OFFICER', office: 'ALL', isCrossOffice: true },
                CAMPUS_DIRECTOR: { userId: 'mock-director-id', username: 'mock_director', displayName: 'Mock CampusDirector', armsRole: 'CAMPUS_DIRECTOR', office: 'ALL', isCrossOffice: true },
            };
            claims = legacyMap[legacyRole] ?? legacyMap['STAFF'];
        }

        const armsRole = claims.armsRole || claims.role || 'STAFF';
        return {
            userId: claims.userId || 'mock-user',
            username: claims.username || 'mock_user',
            displayName: claims.displayName || claims.username || 'Mock User',
            office: claims.office || 'ACAD',
            departmentId: claims.departmentId,
            armsRole,
            isCrossOffice: !!claims.isCrossOffice || CROSS_OFFICE_ROLES.has(armsRole),
        };
    }

    // ── REAL mode (TT4) — local RS256 verification, no ARMS round-trip ────
    private validateReal(token: string): ValidatedArmsUser {
        const publicKey = this.config.get<string>('ARMS_JWT_PUBLIC_KEY');
        if (!publicKey) {
            // Fail closed — never silently fall back to MOCK in REAL mode.
            throw new UnauthorizedException(
                'ARMS_JWT_PUBLIC_KEY is not configured — cannot validate real ARMS tokens',
            );
        }

        let payload: any;
        try {
            payload = jwt.verify(token, publicKey.replace(/\\n/g, '\n'), { algorithms: ['RS256'] });
        } catch {
            throw new UnauthorizedException('Invalid or expired ARMS token');
        }

        // Per ARMS_JWT_CONTRACT.md: user_id, username, role, office_id, department_id, iat, exp
        const armsRole = payload.role || 'STAFF';
        return {
            userId: payload.user_id,
            username: payload.username || payload.user_id,
            displayName: payload.display_name || payload.username || payload.user_id,
            office: payload.office_id,
            departmentId: payload.department_id,
            armsRole,
            isCrossOffice: CROSS_OFFICE_ROLES.has(armsRole),
        };
    }
}