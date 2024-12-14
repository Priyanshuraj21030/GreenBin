import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue } from 'firebase/database';
import { firebaseConfig } from './config.js';

class FirebaseRecyclingAPI {
    constructor() {
        const app = initializeApp(firebaseConfig);
        this.db = getDatabase(app);
    }

    async getWasteStats() {
        try {
            const statsRef = ref(this.db, 'wasteStats');
            const snapshot = await get(statsRef);
            return snapshot.val();
        } catch (error) {
            console.error('Error fetching waste stats:', error);
            throw error;
        }
    }

    subscribeToUpdates(path, callback) {
        const dataRef = ref(this.db, path);
        onValue(dataRef, (snapshot) => {
            callback(snapshot.val());
        });
    }

    async updateStats(path, data) {
        try {
            const dataRef = ref(this.db, path);
            await set(dataRef, data);
        } catch (error) {
            console.error('Error updating stats:', error);
            throw error;
        }
    }
}

export const firebaseAPI = new FirebaseRecyclingAPI(); 