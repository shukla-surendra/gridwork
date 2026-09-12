// Next.js evaluates/prerenders every page once in Node during `next build`
// (even for a static export, even for pages with no data fetching) --
// unlike CRA's pure client bundle, so every localStorage access here needs
// a `typeof window === 'undefined'` guard or the build crashes with
// "ReferenceError: localStorage is not defined" the moment any component
// touches workspace/token/user-id state during its render (not just an
// effect/handler).
const isServer = () => typeof window === 'undefined';

class ConfigService {

    setDefaultWorkspace(default_workspace) {
        if (isServer()) return;
        // Serialize the object to JSON and save it in localStorage
        localStorage.setItem('workspace', JSON.stringify(default_workspace));
    }

    removeDefaultWorkspace() {
        if (isServer()) return;
        // Remove workspace from localStorage
        localStorage.removeItem('workspace');
    }

    getDefaultWorkspace() {
        if (isServer()) {
            throw new Error('No workspace selected');
        }
        // Retrieve the JSON string from localStorage and parse it to an object
        const workspaceJSON = localStorage.getItem('workspace');
        try {
            const workspace = JSON.parse(workspaceJSON);
            if (!workspace || !workspace.workspace_id) {
                throw new Error('Invalid workspace data');
            }
            return workspace;
        } catch (error) {
            console.error('Error parsing workspace from localStorage:', error);
            throw new Error('No workspace selected');
        }
    }

    // Token management methods
    getToken() {
        if (isServer()) return null;
        return localStorage.getItem('access_token');
    }

    setToken(token) {
        if (isServer()) return;
        localStorage.setItem('access_token', token);
    }

    clearToken() {
        if (isServer()) return;
        localStorage.removeItem('access_token');
    }

    // User ID methods
    setUserId(user_id) {
        if (isServer()) return;
        localStorage.setItem('user_id', user_id);
    }

    getUserId() {
        if (isServer()) {
            throw new Error('No user ID found');
        }
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            throw new Error('No user ID found');
        }
        return userId;
    }

    removeUserId() {
        if (isServer()) return;
        localStorage.removeItem('user_id');
    }
}

const config = new ConfigService();
export default config;
