import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';

class UserDashboard {
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
                this.loadUserData(user.uid);
                this.updateUserProfile(user);
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    updateUserProfile(user) {
        const userRef = ref(this.db, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                document.querySelector('.user-profile h5').textContent = userData.name || user.email;
                if (userData.avatar) {
                    document.querySelector('.user-avatar').src = userData.avatar;
                }
                document.querySelector('.points-badge').innerHTML = 
                    `<i class="bi bi-star-fill me-2"></i>${userData.points || 0} Points`;
            }
        });
    }

    loadUserData(uid) {
        this.loadPickupHistory(uid);
        this.loadEnvironmentalImpact(uid);
        this.initializeCharts();
    }

    loadPickupHistory(uid) {
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
            this.updatePickupHistory(pickups.reverse());
            this.updateRecyclingChart(pickups);
        });
    }

    updatePickupHistory(pickups) {
        const historyContainer = document.getElementById('pickupHistory');
        historyContainer.innerHTML = pickups.map(pickup => `
            <div class="pickup-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <span class="pickup-type type-${pickup.wasteType.toLowerCase()}">${pickup.wasteType}</span>
                        <h6 class="mb-1">${pickup.weight} kg collected</h6>
                        <span class="pickup-date">
                            <i class="bi bi-calendar3 me-2"></i>${new Date(pickup.date).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="text-end">
                        <div class="text-success">+${pickup.points || 0} points</div>
                        <small class="text-muted">${pickup.status}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    loadEnvironmentalImpact(uid) {
        const impactRef = ref(this.db, `impact/${uid}`);
        onValue(impactRef, (snapshot) => {
            const impact = snapshot.val() || {};
            // Update impact statistics
            document.querySelectorAll('.achievement-card').forEach(card => {
                const type = card.querySelector('.text-muted').textContent.toLowerCase();
                if (type.includes('recycled')) {
                    card.querySelector('h3').textContent = `${impact.totalRecycled || 0} kg`;
                } else if (type.includes('trees')) {
                    card.querySelector('h3').textContent = impact.treesSaved || 0;
                } else if (type.includes('pickups')) {
                    card.querySelector('h3').textContent = impact.totalPickups || 0;
                }
            });
        });
    }

    initializeCharts() {
        const ctx = document.getElementById('recyclingChart').getContext('2d');
        this.charts.recycling = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Recycling (kg)',
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
                document.querySelector('.nav-link.active')?.classList.remove('active');
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
    new UserDashboard();
}); 