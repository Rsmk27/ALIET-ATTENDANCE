import { z } from 'zod';

/**
 * Validation schemas for API endpoints
 * SECURITY: Input validation to prevent injection and ensure data integrity
 */

// Password validation: minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character (@$!%*?&#)');

// Email validation
export const emailSchema = z.string()
    .email('Invalid email format')
    .max(254, 'Email must not exceed 254 characters');

// UID validation (Firebase UIDs are 28 characters alphanumeric)
export const uidSchema = z.string()
    .min(1, 'UID is required')
    .max(128, 'UID must not exceed 128 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'UID contains invalid characters');

// Admin token validation
export const tokenSchema = z.string()
    .min(1, 'Token is required');

// Update password request schema
export const updatePasswordRequestSchema = z.object({
    uid: uidSchema,
    email: emailSchema.optional(),
    newPassword: passwordSchema,
    adminToken: tokenSchema
});

// Delete user request schema
export const deleteUserRequestSchema = z.object({
    uid: uidSchema,
    adminToken: tokenSchema
});
