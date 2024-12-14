import { API_CONFIG } from './config.js';

class RecyclingAPI {
    constructor() {
        this.baseUrl = 'https://api.openrecycle.org/v1';
        this.apiKey = 'YOUR_API_KEY';
    }

    async getWasteStats() {
        try {
            const response = await fetch(`${this.baseUrl}/statistics/waste`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching waste stats:', error);
            throw error;
        }
    }

    async getRecyclingRate() {
        try {
            const response = await fetch(`${this.baseUrl}/statistics/recycling-rate`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching recycling rate:', error);
            throw error;
        }
    }

    async getEnvironmentalImpact() {
        try {
            const response = await fetch(`${this.baseUrl}/impact/environmental`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching environmental impact:', error);
            throw error;
        }
    }
}

export const recyclingAPI = new RecyclingAPI(); 