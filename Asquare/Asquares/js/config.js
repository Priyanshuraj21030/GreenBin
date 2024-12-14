// Create this new file to store API configurations
export const API_CONFIG = {
    epa: {
        apiKey: 'YOUR_EPA_API_KEY',
        baseUrl: 'https://edg.epa.gov/metadata/rest/find/document',
        endpoints: {
            wasteStats: '/waste-management',
            recyclingData: '/recycling-statistics'
        }
    }
}; 

// Firebase configuration
export const firebaseConfig = {
    apiKey: "xxx-your-actual-api-key-xxx",
    authDomain: "asquare-recycling.firebaseapp.com",
    projectId: "asquare-recycling",
    databaseURL: "https://asquare-recycling.firebaseio.com",
    storageBucket: "asquare-recycling.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
}; 

export const config = {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao'
}; 