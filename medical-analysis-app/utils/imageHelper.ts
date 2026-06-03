import { User } from '../types/userType';

// Helper function to normalize the user object structure
export const normalizeUser = (user: any): User => {
    let finalUserImageUrl: string | null = null;
    const userImage = user.userImage;

    // Check if userImage is a non-null object
    if (typeof userImage === 'object' && userImage !== null) {
        // Step 1: Extract the URL from the object. This will be a string or null.
        const extractedUrl = userImage.url;

        // Step 2: Only assign if the extracted URL is a truthy value (i.e., not null, not "", not 0, etc.)
        if (extractedUrl) {
            finalUserImageUrl = extractedUrl;
        }
        
    } else if (typeof userImage === 'string' && userImage) {
        // Handle case where it might already be a string URL (e.g., from editProfile response)
        finalUserImageUrl = userImage;
    }
    
    // The finalUserImageUrl is guaranteed to be a string URL or null.
    // If userImage was {"url": null}, it is now null.
    // If userImage was an empty string, it is now null.

    // Return the user object with the normalized userImage property
    return {
        ...user,
        userImage: finalUserImageUrl, // This is guaranteed to be a string URL or null
    } as User; // Cast to your User type
};