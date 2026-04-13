/** Allowed department names for Admin signup (must match RPC validation). */
export const ADMIN_SIGNUP_DEPARTMENT_NAMES = ['Cardiothoracic', 'ENT', 'Urology'] as const;

export type AdminSignupDepartmentName = (typeof ADMIN_SIGNUP_DEPARTMENT_NAMES)[number];
