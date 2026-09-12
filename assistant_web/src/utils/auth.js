import decode from 'jwt-decode';
import config from '../utils/config';
import { Select, Box } from '@chakra-ui/react';
import { FiChevronDown, FiLogOut } from 'react-icons/fi';

class AuthService {
	// retrieve data saved in token
	getProfile() {
		// Next.js evaluates page modules once in Node during `next build`'s
		// page-data-collection pass, even for pages with no data fetching --
		// unlike CRA (a pure client bundle), so any module-load-time call
		// into here (e.g. slices/auth.js's initialState) needs a guard.
		if (typeof window === 'undefined') return null;
		const userInfo = localStorage.getItem('user_info');
		return userInfo ? JSON.parse(userInfo) : null;
	}

	// check if the user is still logged in
	loggedIn() {
		// checks if there is a saved token and it's still valid
		const token = this.getToken();
		// use type coersion to check if the token is NOT undefined and the token is NOT expired
		return !!token && !this.isTokenExpired(token);
	}

	// Check if the token has expired
	isTokenExpired(token) {
		try {
			const decoded = decode(token);
			if (decoded.exp < Date.now() / 1000) {
				return true;
			} else {
				return false;
			}
		} catch (err) {
			return false;
		}
	}

	// Retrieve the token from localStorage
	getToken() {
		if (typeof window === 'undefined') return null;
		return localStorage.getItem('access_token');
	}

	// Set token to localStorage and reload page to the homepage
	login(loginResponse) {
		try {
			console.log('Login response:', loginResponse);
			
			// Store the access token
			localStorage.setItem('access_token', loginResponse.access_token);
			
			// Store user info
			const userInfo = {
				user_id: loginResponse.user.user_id,
				email: loginResponse.user.email,
				first_name: loginResponse.user.first_name,
				last_name: loginResponse.user.last_name,
				role: loginResponse.user.role,
				avatar_url: loginResponse.user.avatar_url
			};
			localStorage.setItem('user_info', JSON.stringify(userInfo));
			
			// Set default workspace
			if (loginResponse.user.default_workspace) {
				const default_workspace = {
					workspace_id: loginResponse.user.default_workspace.workspace_id,
					name: loginResponse.user.default_workspace.name,
					owner_id: loginResponse.user.user_id
				};
				console.log('Setting default workspace:', default_workspace);
				config.setDefaultWorkspace(default_workspace);
			} else {
				console.warn('No default workspace in login response');
			}
			
			config.setUserId(loginResponse.user.user_id);
			
			window.location.assign('/');
		} catch (error) {
			console.error('Error during login:', error);
			throw error;
		}
	}

	// Merge fresh fields (e.g. after a profile edit) into the stored user_info
	// without touching the token/workspace -- whitelist keys so a raw DB row
	// (which can carry password_hash) never lands in localStorage.
	updateProfile(userData) {
		const current = this.getProfile() || {};
		const merged = {
			...current,
			...(userData.user_id !== undefined && { user_id: userData.user_id }),
			...(userData.email !== undefined && { email: userData.email }),
			...(userData.first_name !== undefined && { first_name: userData.first_name }),
			...(userData.last_name !== undefined && { last_name: userData.last_name }),
			...(userData.role !== undefined && { role: userData.role }),
			...(userData.avatar_url !== undefined && { avatar_url: userData.avatar_url }),
			...(userData.bio !== undefined && { bio: userData.bio }),
		};
		localStorage.setItem('user_info', JSON.stringify(merged));
		return merged;
	}

	// lear token from localstorage and force logout with reload
	logout() {
		localStorage.removeItem('access_token');
		config.removeDefaultWorkspace();
		// reload the page and reset the state of the app
		window.location.assign('/');
	}
}

const authService = new AuthService();
export default authService;
