import { SetMetadata } from '@nestjs/common';
import { Permission } from '../rbac/permission.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...permissions: Permission[]) => SetMetadata(ROLES_KEY, permissions);
