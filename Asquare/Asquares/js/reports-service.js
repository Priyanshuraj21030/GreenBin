import { firebaseAPI } from './firebase-service.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from './config.js';

class ReportsService {
    constructor() {
        this.storage = getStorage();
    }

    async generateReport(type, dateRange) {
        try {
            const data = await this.fetchReportData(type, dateRange);
            const report = this.formatReport(data, type);
            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    async fetchReportData(type, dateRange) {
        const reports = {
            'waste-collection': async () => await firebaseAPI.getWasteStats(),
            'environmental-impact': async () => await firebaseAPI.getEnvironmentalImpact(),
            'user-activity': async () => await firebaseAPI.getUserStats(),
            'custom': async () => await this.fetchCustomReportData(dateRange)
        };

        return await reports[type]();
    }

    formatReport(data, type) {
        const formats = {
            'csv': this.formatCSV,
            'pdf': this.formatPDF,
            'excel': this.formatExcel
        };

        return formats[type](data);
    }

    async saveReport(report, filename) {
        const reportRef = storageRef(this.storage, `reports/${filename}`);
        await uploadBytes(reportRef, report);
        return await getDownloadURL(reportRef);
    }
}

export const reportsService = new ReportsService(); 