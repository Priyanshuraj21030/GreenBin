import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue, update, query, orderByChild, limitToLast } from 'firebase/database';

class AdminDashboard {
    constructor() {
        this.auth = getAuth();
        this.db = getDatabase();
        this.charts = {};

        this.initializeAuth();
        this.setupEventListeners();
    }

    initializeAuth() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.checkAdminStatus(user.uid);
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    async checkAdminStatus(uid) {
        const adminRef = ref(this.db, `admins/${uid}`);
        onValue(adminRef, (snapshot) => {
            if (!snapshot.exists()) {
                window.location.href = 'user-dashboard.html';
            } else {
                this.loadDashboardData();
            }
        });
    }

    loadDashboardData() {
        this.loadStats();
        this.loadRequests();
        this.initializeCharts();
    }

    loadStats() {
        const statsRef = ref(this.db, 'stats');
        onValue(statsRef, (snapshot) => {
            const stats = snapshot.val() || {};
            
            // Update dashboard stats
            document.getElementById('pendingRequests').textContent = stats.pendingRequests || 0;
            document.getElementById('activePickups').textContent = stats.activePickups || 0;
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('totalWaste').textContent = this.formatWaste(stats.totalWaste || 0);
        });
    }

    formatWaste(kg) {
        return kg >= 1000 ? `${(kg/1000).toFixed(1)}t` : `${kg}kg`;
    }

    loadRequests() {
        const requestsRef = ref(this.db, 'pickupRequests');
        const recentRequestsQuery = query(requestsRef, orderByChild('date'), limitToLast(10));

        onValue(recentRequestsQuery, (snapshot) => {
            const requests = [];
            snapshot.forEach((childSnapshot) => {
                requests.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            this.updateRequestsTable(requests.reverse());
        });
    }

    updateRequestsTable(requests) {
        const tableBody = document.getElementById('requestsTableBody');
        tableBody.innerHTML = requests.map(request => `
            <tr>
                <td>#${request.id.slice(0, 8)}</td>
                <td>${request.userName}</td>
                <td>${request.wasteType}</td>
                <td>${request.location.slice(0, 20)}...</td>
                <td>${new Date(request.date).toLocaleDateString()}</td>
                <td><span class="status-badge status-${request.status.toLowerCase()}">${request.status}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="assignPickup('${request.id}')">
                            <i class="bi bi-person-check"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="completePickup('${request.id}')">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    initializeCharts() {
        this.initializePickupTrendsChart();
        this.initializeWasteDistributionChart();
    }

    initializePickupTrendsChart() {
        const ctx = document.getElementById('pickupTrendsChart').getContext('2d');
        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getLast7Days(),
                datasets: [{
                    label: 'Daily Pickups',
                    data: [12, 19, 15, 25, 22, 30, 28],
                    borderColor: '#1e4d3b',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(30, 77, 59, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeWasteDistributionChart() {
        const ctx = document.getElementById('wasteDistributionChart').getContext('2d');
        this.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Recyclable', 'E-Waste', 'Hazardous', 'General'],
                datasets: [{
                    data: [40, 20, 10, 30],
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#6c757d'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    getLast7Days() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toLocaleDateString('default', { weekday: 'short' }));
        }
        return dates;
    }

    setupEventListeners() {
        // Refresh Data
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadDashboardData();
        });

        // View All Requests
        document.getElementById('viewAllRequests').addEventListener('click', () => {
            // Implement view all functionality
        });

        // Mobile sidebar toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-primary d-lg-none position-fixed';
        toggleBtn.style.cssText = 'top: 1rem; left: 1rem; z-index: 1001;';
        toggleBtn.innerHTML = '<i class="bi bi-list"></i>';
        document.body.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

// Global functions for table actions
window.assignPickup = (requestId) => {
    // Implement assign pickup functionality
};

window.completePickup = (requestId) => {
    // Implement complete pickup functionality
}; 