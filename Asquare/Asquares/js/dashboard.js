import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';

class Dashboard {
    constructor() {
        this.auth = getAuth();
        this.db = getDatabase();
        this.isAdmin = false;
        this.charts = {};

        this.initializeAuth();
        this.setupEventListeners();
    }

    initializeAuth() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.checkAdminStatus(user.uid);
                this.loadUserData(user.uid);
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    async checkAdminStatus(uid) {
        const adminRef = ref(this.db, `admins/${uid}`);
        onValue(adminRef, (snapshot) => {
            this.isAdmin = snapshot.exists();
            this.updateUIForRole();
        });
    }

    updateUIForRole() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = this.isAdmin ? 'block' : 'none';
        });
    }

    loadUserData(uid) {
        this.loadPickups(uid);
        this.initializeCharts();
    }

    loadPickups(uid) {
        const pickupsRef = ref(this.db, `pickups/${uid}`);
        const recentPickupsQuery = query(pickupsRef, orderByChild('date'), limitToLast(5));

        onValue(recentPickupsQuery, (snapshot) => {
            const pickups = [];
            snapshot.forEach((childSnapshot) => {
                pickups.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            this.updatePickupsTable(pickups.reverse());
            this.updateRecyclingChart(pickups);
        });
    }

    updatePickupsTable(pickups) {
        const tableBody = document.getElementById('pickupsTableBody');
        tableBody.innerHTML = pickups.map(pickup => `
            <tr>
                <td>${new Date(pickup.date).toLocaleDateString()}</td>
                <td>${pickup.wasteType}</td>
                <td>${pickup.weight || '-'} kg</td>
                <td>${pickup.points || 0}</td>
                <td><span class="status-badge status-${pickup.status.toLowerCase()}">${pickup.status}</span></td>
            </tr>
        `).join('');
    }

    initializeCharts() {
        this.initializeRecyclingChart();
        this.initializeWasteDistributionChart();
    }

    initializeRecyclingChart() {
        const ctx = document.getElementById('recyclingChart').getContext('2d');
        this.charts.recycling = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Recycled Waste (kg)',
                    data: [],
                    borderColor: '#28a745',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(40, 167, 69, 0.1)'
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
                labels: ['General', 'Recyclable', 'E-Waste', 'Hazardous'],
                datasets: [{
                    data: [30, 40, 20, 10],
                    backgroundColor: [
                        '#6c757d',
                        '#28a745',
                        '#ffc107',
                        '#dc3545'
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

    updateRecyclingChart(pickups) {
        const monthlyData = this.aggregateMonthlyData(pickups);
        
        this.charts.recycling.data.labels = monthlyData.labels;
        this.charts.recycling.data.datasets[0].data = monthlyData.data;
        this.charts.recycling.update();
    }

    aggregateMonthlyData(pickups) {
        const monthlyTotals = {};
        
        pickups.forEach(pickup => {
            const date = new Date(pickup.date);
            const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            
            monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + (pickup.weight || 0);
        });

        return {
            labels: Object.keys(monthlyTotals),
            data: Object.values(monthlyTotals)
        };
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelector('.nav-link.active').classList.remove('active');
                e.target.classList.add('active');
            });
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
    new Dashboard();
}); 