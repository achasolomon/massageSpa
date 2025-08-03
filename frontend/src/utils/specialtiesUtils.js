// utils/specialtyUtils.js

/**
 * Format therapist specialties for display
 * Handles different storage formats: array, JSON string, comma-separated string
 * @param {*} specialties - The specialties data in any format
 * @returns {string} - Formatted specialties string
 */
export const formatSpecialties = (specialties) => {
    if (!specialties) return 'General';

    // If it's already an array
    if (Array.isArray(specialties)) {
        return specialties.length > 0 ? specialties.join(', ') : 'General';
    }

    // If it's a string
    if (typeof specialties === 'string') {
        // Check if it's empty
        if (!specialties.trim()) return 'General';

        try {
            // Try parsing as JSON array first
            const parsed = JSON.parse(specialties);
            if (Array.isArray(parsed)) {
                return parsed.length > 0 ? parsed.join(', ') : 'General';
            }
            // If JSON but not array, return as string
            return parsed.toString();
        } catch {
            // Not JSON, treat as comma-separated or plain string
            return specialties;
        }
    }

    // For any other type, convert to string
    return specialties.toString() || 'General';
};

/**
 * Parse specialties from various formats into an array
 * @param {*} specialties - The specialties data in any format
 * @returns {Array<string>} - Array of specialty strings
 */
export const parseSpecialties = (specialties) => {
    if (!specialties) return [];

    // If it's already an array
    if (Array.isArray(specialties)) {
        return specialties.filter(s => s && s.trim());
    }

    // If it's a string
    if (typeof specialties === 'string') {
        if (!specialties.trim()) return [];

        try {
            // Try parsing as JSON array first
            const parsed = JSON.parse(specialties);
            if (Array.isArray(parsed)) {
                return parsed.filter(s => s && s.trim());
            }
            // If JSON but not array, return as single item
            return [parsed.toString()];
        } catch {
            // Not JSON, split by comma and clean up
            return specialties
                .split(',')
                .map(s => s.trim())
                .filter(s => s);
        }
    }

    // For any other type, convert to string and return as single item
    return [specialties.toString()];
};

/**
 * Convert specialties to database storage format
 * @param {Array<string>} specialtiesArray - Array of specialty strings
 * @returns {string} - JSON string for database storage
 */
export const specializiesToDB = (specialtiesArray) => {
    if (!Array.isArray(specialtiesArray)) {
        return JSON.stringify([]);
    }

    const cleaned = specialtiesArray
        .filter(s => s && s.trim())
        .map(s => s.trim());

    return JSON.stringify(cleaned);
};

/**
 * Get specialty initials for avatar display
 * @param {*} specialties - The specialties data
 * @returns {string} - Initials (max 2 characters)
 */
export const getSpecialtyInitials = (specialties) => {
    const specialtyArray = parseSpecialties(specialties);

    if (specialtyArray.length === 0) return 'T'; // Default to 'T' for Therapist

    if (specialtyArray.length === 1) {
        // Single specialty - take first 2 characters
        return specialtyArray[0].substring(0, 2).toUpperCase();
    }

    // Multiple specialties - take first letter of first two
    return specialtyArray
        .slice(0, 2)
        .map(s => s.charAt(0))
        .join('')
        .toUpperCase();
};

// Export all utilities
export default {
    formatSpecialties,
    parseSpecialties,
    specializiesToDB,
    getSpecialtyInitials
};