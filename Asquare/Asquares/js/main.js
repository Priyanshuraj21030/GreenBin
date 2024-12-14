import { db } from './firebase-init.js';
import { ref, onValue, set } from 'firebase/database';
import { firebaseAPI } from './firebase-service.js';
import { reportsService } from './reports-service.js';
import { Chart } from 'chart.js/auto';

// Function to update the dashboard with real data
async function updateDashboard() {
    try {
        // Get waste statistics
        const wasteStats = await firebaseAPI.getWasteStats();
        updateWasteDisplay(wasteStats);

        // Subscribe to real-time updates
        firebaseAPI.subscribeToUpdates('wasteStats', (data) => {
            updateWasteDisplay(data);
        });

    } catch (error) {
        console.error('Error updating dashboard:', error);
        showErrorAlert('Failed to fetch latest statistics');
    }
}

// Function to update waste display
function updateWasteDisplay(data) {
    if (!data) return;

    // Update total waste collected
    const wasteElement = document.querySelector('.border-success .card-title');
    if (wasteElement) {
        wasteElement.textContent = `${data.totalCollected} kg`;
    }

    // Update trend
    const trendElement = document.querySelector('.border-success small');
    if (trendElement) {
        const trend = data.trend || {};
        const arrow = trend.change >= 0 ? '↑' : '↓';
        trendElement.textContent = `${arrow} ${Math.abs(trend.change)}% ${trend.period}`;
        trendElement.className = `text-${trend.change >= 0 ? 'success' : 'danger'}`;
    }
}

// Function to show error alert
function showErrorAlert(message) {
    const alertElement = document.querySelector('.alert-api-error');
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.classList.remove('d-none');
    }
}

// Function to initialize charts
function initializeCharts() {
    // Waste Collection Chart
    const wasteCtx = document.getElementById('wasteCollectionChart');
    if (wasteCtx) {
        new Chart(wasteCtx, {
            type: 'bar',
            data: {
                labels: ['Plastic', 'Paper', 'Glass', 'Metal'],
                datasets: [{
                    label: 'Collection by Type (%)',
                    data: [40, 25, 20, 15],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(23, 162, 184, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ]
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
}

// Function to handle report generation
async function handleReportGeneration(type, format) {
    try {
        const loadingSpinner = document.querySelector('.report-loading');
        loadingSpinner.classList.remove('d-none');

        const dateRange = {
            start: document.querySelector('#reportStartDate').value,
            end: document.querySelector('#reportEndDate').value
        };

        const report = await reportsService.generateReport(type, dateRange);
        const filename = `${type}_report_${new Date().toISOString()}.${format}`;
        const downloadUrl = await reportsService.saveReport(report, filename);

        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error generating report:', error);
        showErrorAlert('Failed to generate report');
    } finally {
        document.querySelector('.report-loading').classList.add('d-none');
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    initializeCharts();

    // Add click handlers for time period buttons
    document.querySelectorAll('.btn-group-sm .btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const period = this.textContent.toLowerCase();
            try {
                await firebaseAPI.updateStats('selectedPeriod', period);
            } catch (error) {
                console.error('Error updating period:', error);
            }
        });
    });

    // Add report generation handlers
    document.querySelectorAll('.generate-report').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.reportType;
            const format = document.querySelector('#reportFormat').value;
            handleReportGeneration(type, format);
        });
    });

    // Animate statistics when they come into view
    const stats = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = parseInt(target.getAttribute('data-value'));
                animateValue(target, 0, value, 2000);
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
});

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
} 