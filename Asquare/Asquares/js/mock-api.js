class MockRecyclingAPI {
    constructor() {
        this.storage = window.localStorage;
        this.initializeData();
    }

    initializeData() {
        if (!this.storage.getItem('wasteStats')) {
            this.storage.setItem('wasteStats', JSON.stringify({
                totalCollected: 2450,
                trend: { change: 12, period: 'from yesterday' }
            }));
        }
    }

    async getWasteStats() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = JSON.parse(this.storage.getItem('wasteStats'));
                resolve({
                    ...data,
                    totalCollected: data.totalCollected + Math.floor(Math.random() * 100)
                });
            }, 500);
        });
    }

    async getRecyclingRate() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    rate: Math.floor(Math.random() * 20) + 70,
                    trend: {
                        change: Math.floor(Math.random() * 10),
                        period: 'this month'
                    }
                });
            }, 500);
        });
    }
}

export const mockAPI = new MockRecyclingAPI(); 