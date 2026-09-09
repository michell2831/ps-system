import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Permission } from '../rbac/permission.enum';
import { RolePermissions } from '../rbac/role-permissions';
import { Role } from '../rbac/role.enum';

function normalizeRole(roleStr: string): Role | undefined {
  if (!roleStr) return undefined;
  const upper = String(roleStr).toUpperCase().replace(/[\s_-]/g, '');
  if (upper === 'SUPERADMIN') return Role.SUPER_ADMIN;
  if (upper === 'PLANNINGOFFICER') return Role.PLANNING_OFFICER;
  if (upper === 'ADMIN' || upper === 'SUBSYSTEMADMIN' || upper === 'OFFICEHEAD') return Role.ADMIN;
  if (upper === 'OPCREVALUATOR') return Role.OPCR_EVALUATOR;
  if (upper === 'CAMPUSDIRECTOR' || upper === 'DIRECTOR') return Role.CAMPUS_DIRECTOR;
  if (upper === 'STAFF') return Role.STAFF;
  return undefined;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }

    const normalized = normalizeRole(user.role);
    const userPermissions = normalized ? RolePermissions[normalized] : (RolePermissions[user.role as Role] || undefined);
    if (!userPermissions) {
      throw new ForbiddenException(`Unrecognized role: ${user.role}`);
    }

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
