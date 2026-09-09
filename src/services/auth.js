// Authentication Architecture for Planning & Standards System (PSS)
//
// STRUCTURE:
//   - TemporaryAuthProvider: Uses the 9 authorized pilot accounts without undeployed ARMS calls.
//   - ArmsAuthProvider: Modular stub ready to be activated when the ARMS auth microservice is deployed.

const PSS_TOKEN_KEY = 'pss_token';

// ---------------------------------------------------------------------------
// ARMS role → PSS internal role mapping (shared across frontend and backend RBAC)
// ---------------------------------------------------------------------------
export const ARMS_ROLE_MAP = {
    SUPER_ADMIN: 'SuperAdmin',
    SUBSYSTEM_ADMIN: 'Admin',
    STAFF: 'Staff',
    OPCR_EVALUATOR: 'OPCREvaluator',
    PLANNING_OFFICER: 'PlanningOfficer',
    CAMPUS_DIRECTOR: 'CampusDirector',
};

export const ROLE_DEFAULT_PAGE = {
    'SUPER_ADMIN': 'dashboard',
    'PLANNING_OFFICER': 'planningHub',
    'SUBSYSTEM_ADMIN': 'dashboard',
    'STAFF': 'serviceCatalogue',
    'OPCR_EVALUATOR': 'opcrCommitments',
    'CAMPUS_DIRECTOR': 'dashboard',
};

// ---------------------------------------------------------------------------
// Predefined 9 Authorized Pilot Users Directory
// (The ONLY 9 users permitted in the temporary authentication system)
// ---------------------------------------------------------------------------
export const PREDEFINED_MOCK_USERS = [
    {
        id: 'mock-juan',
        displayName: 'Juan dela Cruz',
        username: 'juan.delacruz',
        armsRole: 'STAFF',
        office: 'ACAD',
        isCrossOffice: false,
        roleLabel: 'Staff',
        officeLabel: 'Academic Affairs Office (ACAD)',
        description: 'Read-only access to ACAD services. OPCR Commitments hidden.',
    },
    {
        id: 'mock-maria',
        displayName: 'Maria Garcia',
        username: 'maria.garcia',
        armsRole: 'SUBSYSTEM_ADMIN',
        office: 'ACAD',
        isCrossOffice: false,
        roleLabel: 'Office Head',
        officeLabel: 'Academic Affairs Office (ACAD)',
        description: 'Manage Services/KPIs/SLAs/Holidays for ACAD only.',
    },
    {
        id: 'mock-jose',
        displayName: 'Jose Santos',
        username: 'jose.santos',
        armsRole: 'STAFF',
        office: 'OSAS',
        isCrossOffice: false,
        roleLabel: 'Staff',
        officeLabel: 'Student Affairs Office (OSAS)',
        description: 'Read-only access to OSAS services. OPCR Commitments hidden.',
    },
    {
        id: 'mock-pedro',
        displayName: 'Pedro Bautista',
        username: 'pedro.bautista',
        armsRole: 'SUBSYSTEM_ADMIN',
        office: 'OSAS',
        isCrossOffice: false,
        roleLabel: 'Office Head',
        officeLabel: 'Student Affairs Office (OSAS)',
        description: 'Manage Services/KPIs/SLAs/Holidays for OSAS only.',
    },
    {
        id: 'mock-jillian',
        displayName: 'Jillian Reyes',
        username: 'jillian.reyes',
        armsRole: 'STAFF',
        office: 'ADMIN',
        isCrossOffice: false,
        roleLabel: 'Staff',
        officeLabel: 'Administration Office (ADMIN)',
        description: 'Read-only access to ADMIN services. OPCR Commitments hidden.',
    },
    {
        id: 'mock-albert',
        displayName: 'Albert Lim',
        username: 'albert.lim',
        armsRole: 'SUBSYSTEM_ADMIN',
        office: 'ADMIN',
        isCrossOffice: false,
        roleLabel: 'Office Head',
        officeLabel: 'Administration Office (ADMIN)',
        description: 'Manage Services/KPIs/SLAs/Holidays for ADMIN only.',
    },
    {
        id: 'mock-ana',
        displayName: 'Ana Reyes',
        username: 'ana.reyes',
        armsRole: 'CAMPUS_DIRECTOR',
        office: 'ALL',
        isCrossOffice: true,
        roleLabel: 'Campus Director',
        officeLabel: 'All Offices (Campus-Wide)',
        description: 'Campus Director / OPCR Evaluator. Full campus-wide read-only oversight across all modules.',
    },
    {
        id: 'mock-carlo',
        displayName: 'Carlo Mendoza',
        username: 'carlo.mendoza',
        armsRole: 'PLANNING_OFFICER',
        office: 'ALL',
        isCrossOffice: true,
        roleLabel: 'Planning Officer',
        officeLabel: 'All Offices (Cross-Office)',
        description: 'Cross-office planning officer. Manages KPIs, SLA Rules, Evaluation Periods, Service Modes, and compiles/locks Campus OPCR.',
    },
    {
        id: 'mock-superadmin',
        displayName: 'Ricardo Santos',
        username: 'ricardo.santos',
        armsRole: 'SUPER_ADMIN',
        office: 'ALL',
        isCrossOffice: true,
        roleLabel: 'Super Admin',
        officeLabel: 'All Offices (Cross-Office)',
        description: 'Super Admin. Full access to all modules across all offices.',
    },
];

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken() {
    return localStorage.getItem(PSS_TOKEN_KEY);
}

export function setToken(token) {
    if (token) {
        localStorage.setItem(PSS_TOKEN_KEY, token);
    }
}

export function clearToken() {
    localStorage.removeItem(PSS_TOKEN_KEY);
    localStorage.removeItem('pss_default_page');
}

/**
 * Encodes a claims object into the `mock-token-<base64>` format.
 * Recognized by frontend RBAC and backend API Gateway JwtAuthGuard.
 */
export function encodeMockToken(claims) {
    const json = JSON.stringify(claims);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `mock-token-${b64}`;
}

/**
 * Decodes the current active token and returns a normalized user object.
 * Returns null if no token is present, invalid, or unauthorized.
 */
export function decodeCurrentUser() {
    const token = getToken();
    if (!token) return null;

    let claims = null;

    if (token.startsWith('mock-token-')) {
        const b64Part = token.slice('mock-token-'.length);
        try {
            const json = decodeURIComponent(escape(atob(b64Part)));
            claims = JSON.parse(json);
        } catch (e) {
            console.warn('[auth] Failed to decode mock token:', e);
            return null;
        }
    } else {
        // Real JWT — decode payload
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                window.atob(base64).split('').map((c) =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('')
            );
            claims = JSON.parse(jsonPayload);
        } catch (e) {
            console.warn('[auth] Failed to decode JWT:', e);
            return null;
        }
    }

    if (!claims) return null;

    const username = (claims.username || '').toLowerCase();
    // Validate against the authorized 9 users
    const matched = PREDEFINED_MOCK_USERS.find(
        (u) => u.username.toLowerCase() === username || u.id === claims.userId
    );

    if (!matched) {
        // Unauthorized or unknown user
        return null;
    }

    const armsRole = matched.armsRole || claims.armsRole || 'STAFF';

    return {
        userId: matched.id,
        username: matched.username,
        displayName: matched.displayName,
        armsRole: armsRole,
        role: ARMS_ROLE_MAP[armsRole] || 'Staff',
        office: matched.office,
        isCrossOffice: !!matched.isCrossOffice,
        roleLabel: matched.roleLabel,
        officeLabel: matched.officeLabel,
    };
}

export function getUserRoleFromToken() {
    const user = decodeCurrentUser();
    return user?.role || 'Staff';
}

export function decodeJwt(token) {
    return decodeCurrentUser();
}

export function isAuthenticated() {
    return !!decodeCurrentUser();
}

export function initTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
        setToken(token);
        params.delete('token');
        const newSearch = params.toString();
        const newUrl =
            window.location.pathname +
            (newSearch ? `?${newSearch}` : '') +
            window.location.hash;
        window.history.replaceState({}, '', newUrl);
    }
}

// ---------------------------------------------------------------------------
// Authentication Providers (Abstraction Layer)
// ---------------------------------------------------------------------------

export class TemporaryAuthProvider {
    /**
     * Authenticates as one of the 9 predefined pilot users.
     * ZERO external network calls.
     */
    login(usernameOrIdentifier) {
        const identifier = typeof usernameOrIdentifier === 'string'
            ? usernameOrIdentifier.trim().toLowerCase()
            : usernameOrIdentifier?.username?.trim()?.toLowerCase();

        const targetUser = PREDEFINED_MOCK_USERS.find(
            (u) => u.username.toLowerCase() === identifier || u.id === identifier
        );

        if (!targetUser) {
            throw new Error('Access denied: User is not authorized in the 9 pilot accounts list.');
        }

        const claims = {
            userId: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.displayName,
            armsRole: targetUser.armsRole,
            office: targetUser.office,
            isCrossOffice: targetUser.isCrossOffice,
            role: ARMS_ROLE_MAP[targetUser.armsRole] || 'Staff',
        };

        const token = encodeMockToken(claims);
        setToken(token);

        const defaultPage = ROLE_DEFAULT_PAGE[targetUser.armsRole] || 'dashboard';
        localStorage.setItem('pss_default_page', defaultPage);

        return {
            access_token: token,
            user: {
                ...claims,
                roleLabel: targetUser.roleLabel,
                officeLabel: targetUser.officeLabel,
            },
        };
    }

    logout() {
        clearToken();
    }

    getCurrentUser() {
        return decodeCurrentUser();
    }

    isAuthenticated() {
        return !!this.getCurrentUser();
    }
}

export class ArmsAuthProvider {
    /**
     * Prepared for future deployment of the ARMS Authentication Microservice.
     */
    async login(credentials) {
        throw new Error('ARMS Authentication Microservice is not deployed yet. Using TemporaryAuthProvider.');
    }

    logout() {
        clearToken();
    }

    getCurrentUser() {
        return decodeCurrentUser();
    }

    isAuthenticated() {
        return !!this.getCurrentUser();
    }
}

// Active Authentication Provider
export const authProvider = new TemporaryAuthProvider();