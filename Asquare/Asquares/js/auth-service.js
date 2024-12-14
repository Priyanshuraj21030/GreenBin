import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { firebaseConfig } from './config.js';

class AuthService {
    constructor() {
        this.auth = getAuth();
        this.db = getDatabase();
    }

    // Register new user
    async register(email, password, userType, name) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            
            // Create user profile in database
            await this.createUserProfile(userCredential.user.uid, {
                email,
                name,
                userType,
                createdAt: new Date().toISOString(),
                stats: {
                    totalRecycled: 0,
                    carbonSaved: 0,
                    treesPreserved: 0
                }
            });

            return userCredential.user;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    // Create user profile in database
    async createUserProfile(uid, userData) {
        try {
            const userRef = ref(this.db, `users/${uid}`);
            await set(userRef, userData);
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    // Login user
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile(uid) {
        try {
            const userRef = ref(this.db, `users/${uid}`);
            const snapshot = await get(userRef);
            return snapshot.val();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    // Update user profile
    async updateUserProfile(uid, updates) {
        try {
            const userRef = ref(this.db, `users/${uid}`);
            await set(userRef, updates);
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }
}

export const authService = new AuthService(); 