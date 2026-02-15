/**
 * Security utilities for admin authentication and validation
 */

/**
 * Get the list of admin emails from environment variables
 * Falls back to hardcoded emails for backward compatibility
 * 
 * @returns Array of admin email addresses
 */
export function getAdminEmails(): string[] {
    const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    
    if (envEmails) {
        return envEmails
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);
    }
    
    // Fallback for backward compatibility
    // TODO: Remove after environment variable is properly configured
    return [
        'zestacademyonline@gmail.com',
        'ramunarlapati27@gmail.com'
    ];
}

/**
 * Check if an email is in the admin list
 * 
 * @param email - Email address to check
 * @returns true if email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) {
        return false;
    }
    
    const adminEmails = getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
}
