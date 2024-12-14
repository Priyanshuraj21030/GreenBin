import { authService } from './auth-service.js';
import { Chart } from 'chart.js/auto';

class ProfileController {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.recyclingChart = null;
    }

    async initialize() {
        try {
            // Get current user and profile
            const auth = getAuth();
            this.currentUser = auth.currentUser;
            
            if (!this.currentUser) {
                window.location.href = '/index.html';
                return;
            }

            this.userProfile = await authService.getUserProfile(this.currentUser.uid);
            this.updateUI();
            this.initializeChart();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing profile:', error);
            // Show error message to user
        }
    }

    updateUI() {
        // Update profile information
        document.getElementById('userName').textContent = this.userProfile.name;
        document.getElementById('userType').textContent = this.userProfile.userType;
        document.getElementById('totalRecycled').textContent = `${this.userProfile.stats.totalRecycled} kg`;
        document.getElementById('carbonSaved').textContent = `${this.userProfile.stats.carbonSaved} kg`;
        document.getElementById('treesPreserved').textContent = this.userProfile.stats.treesPreserved;

        // Update form fields
        document.getElementById('updateName').value = this.userProfile.name;
        document.getElementById('updateEmail').value = this.userProfile.email;
    }

    initializeChart() {
        const ctx = document.getElementById('recyclingChart');
        this.recyclingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Monthly Recycling (kg)',
                    data: this.userProfile.stats.monthlyRecycling || [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Handle profile update form submission
        document.getElementById('profileUpdateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const updates = {
                    ...this.userProfile,
                    name: document.getElementById('updateName').value,
                    preferences: {
                        emailNotifications: document.getElementById('emailNotifications').checked
                    }
                };
                await authService.updateUserProfile(this.currentUser.uid, updates);
                // Show success message
            } catch (error) {
                console.error('Error updating profile:', error);
                // Show error message
            }
        });
    }
}

// Initialize profile controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const profileController = new ProfileController();
    profileController.initialize();
}); 