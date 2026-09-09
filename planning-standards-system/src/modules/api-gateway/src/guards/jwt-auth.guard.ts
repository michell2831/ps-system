import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtValidationService } from '../service/jwt-validation.service';

const ARMS_ROLE_MAP: Record<string, string> = {
    SUPER_ADMIN: 'SuperAdmin',
    PLANNING_OFFICER: 'PlanningOfficer',
    SUBSYSTEM_ADMIN: 'Admin',
    OPCR_EVALUATOR: 'OPCREvaluator',
    STAFF: 'Staff',
    CAMPUS_DIRECTOR: 'CampusDirector', // TT3 / Decision #10
};

const OFFICE_NAME_MAP: Record<string, string> = {
    ACAD: 'Campus Academic Office',
    OSAS: 'Campus Student Services and Affairs Office',
    ADMIN: 'Campus Administrative Office',
    ALL: 'ALL',
};

function resolveOfficeName(office: string | undefined): string {
    if (!office) return 'ACAD';
    return OFFICE_NAME_MAP[office] ?? office;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtValidation: JwtValidationService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const claims = await this.jwtValidation.validate(req.headers['authorization']);

        req.user = {
            sub: claims.userId,
            userId: claims.userId,
            username: claims.username,
            displayName: claims.displayName,
            office: resolveOfficeName(claims.office),
            isCrossOffice: claims.isCrossOffice,
            armsRole: claims.armsRole,
            role: ARMS_ROLE_MAP[claims.armsRole] ?? 'Staff',
        };
        return true;
    }
}