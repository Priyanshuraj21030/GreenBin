class RecyclingCenterLocator {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentLocation = null;
        this.centers = [];
        this.selectedCenter = null;
        this.searchRadius = 5000; // 5km
        this.markerIcons = {
            general: 'img/markers/general-marker.png',
            recyclable: 'img/markers/recycle-marker.png',
            ewaste: 'img/markers/ewaste-marker.png',
            hazardous: 'img/markers/hazard-marker.png'
        };
        this.loadingStates = {
            map: document.getElementById('mapLoading'),
            centers: document.getElementById('centersLoading')
        };

        this.initializeMap();
        this.setupEventListeners();
        this.getCurrentLocation();
    }

    initializeMap() {
        this.showLoading('map');
        const mapOptions = {
            zoom: 12,
            center: { lat: 0, lng: 0 },
            mapTypeControl: true,
            fullscreenControl: true,
            streetViewControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            }
        };

        try {
            this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
            this.placesService = new google.maps.places.PlacesService(this.map);
            this.hideLoading('map');
        } catch (error) {
            this.showError('map', 'Failed to load Google Maps. Please check your internet connection.');
            console.error('Map initialization error:', error);
        }
    }

    showLoading(type) {
        this.loadingStates[type].classList.remove('d-none');
    }

    hideLoading(type) {
        this.loadingStates[type].classList.add('d-none');
    }

    showError(type, message) {
        const errorElement = document.getElementById(`${type}Error`);
        errorElement.querySelector('.error-message').textContent = message;
        errorElement.classList.remove('d-none');
        setTimeout(() => {
            errorElement.classList.add('d-none');
        }, 5000);
    }

    setupEventListeners() {
        // Location search
        const searchInput = document.getElementById('locationSearch');
        const searchBox = new google.maps.places.SearchBox(searchInput);

        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();
            if (places.length === 0) return;

            const place = places[0];
            this.currentLocation = place.geometry.location;
            this.map.setCenter(this.currentLocation);
            this.searchNearbyCenters();
        });

        // Use current location
        document.getElementById('useMyLocation').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // Filter buttons
        document.querySelectorAll('.filter-controls .btn').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-controls .btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                this.filterCenters(e.target.dataset.type);
            });
        });
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = new google.maps.LatLng(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    this.map.setCenter(this.currentLocation);
                    this.searchNearbyCenters();
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your location. Please try searching instead.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }

    searchNearbyCenters() {
        this.showLoading('centers');
        document.getElementById('centersEmpty').classList.add('d-none');
        document.getElementById('centersList').innerHTML = '';

        const request = {
            location: this.currentLocation,
            radius: this.searchRadius,
            keyword: 'recycling center'
        };

        this.placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                this.clearMarkers();
                this.centers = results.map(place => ({
                    id: place.place_id,
                    name: place.name,
                    location: place.geometry.location,
                    address: place.vicinity,
                    types: this.categorizeCenter(place.types),
                    rating: place.rating,
                    photo: place.photos?.[0]?.getUrl(),
                    distance: this.calculateDistance(this.currentLocation, place.geometry.location)
                }));
                this.displayCenters();
            } else {
                document.getElementById('centersEmpty').classList.remove('d-none');
                this.showError('search', 'No recycling centers found in this area');
            }
            this.hideLoading('centers');
        });
    }

    calculateDistance(from, to) {
        return (google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000).toFixed(1);
    }

    categorizeCenter(types) {
        const categories = [];
        if (types.includes('recycling_center')) categories.push('recyclable');
        if (types.includes('electronics_store')) categories.push('ewaste');
        if (types.includes('storage')) categories.push('hazardous');
        return categories.length ? categories : ['general'];
    }

    displayCenters() {
        this.centers.forEach(center => {
            const marker = new google.maps.Marker({
                position: center.location,
                map: this.map,
                title: center.name,
                icon: {
                    url: this.markerIcons[center.types[0] || 'general'],
                    scaledSize: new google.maps.Size(30, 30)
                }
            });

            marker.addListener('click', () => {
                this.showCenterInfo(center);
            });

            this.markers.push(marker);
        });

        const centersList = document.getElementById('centersList');
        centersList.innerHTML = this.centers.map(center => `
            <div class="center-card" data-id="${center.id}">
                <h5 class="mb-2">${center.name}</h5>
                <div class="mb-2">
                    ${center.types.map(type => `
                        <span class="center-type type-${type}">${type}</span>
                    `).join('')}
                </div>
                <p class="mb-1 text-muted small">${center.address}</p>
                <div class="distance">
                    <i class="bi bi-geo-alt me-1"></i>${center.distance} km away
                </div>
                ${center.rating ? `
                    <div class="rating">
                        <i class="bi bi-star-fill text-warning me-1"></i>
                        <span>${center.rating}</span>
                    </div>
                ` : ''}
            </div>
        `).join('');

        document.querySelectorAll('.center-card').forEach(card => {
            card.addEventListener('click', () => {
                const center = this.centers.find(c => c.id === card.dataset.id);
                this.showCenterInfo(center);
            });
        });
    }

    showCenterInfo(center) {
        const infoDiv = document.getElementById('centerInfo');
        infoDiv.classList.remove('d-none');

        // Update center info
        infoDiv.querySelector('.center-name').textContent = center.name;
        infoDiv.querySelector('.center-types').innerHTML = center.types.map(type => 
            `<span class="center-type type-${type}">${type}</span>`
        ).join('');
        infoDiv.querySelector('.center-address').textContent = center.address;

        // Update directions button
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${center.location.lat()},${center.location.lng()}`;
        infoDiv.querySelector('.directions-btn').href = directionsUrl;

        // Highlight selected center in list
        document.querySelectorAll('.center-card').forEach(card => {
            card.classList.toggle('active', card.dataset.id === center.id);
        });

        // Pan map to center
        this.map.panTo(center.location);
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    filterCenters(type) {
        if (type === 'all') {
            this.markers.forEach(marker => marker.setMap(this.map));
            document.querySelectorAll('.center-card').forEach(card => {
                card.style.display = 'block';
            });
        } else {
            this.centers.forEach((center, index) => {
                const show = center.types.includes(type);
                this.markers[index].setMap(show ? this.map : null);
                document.querySelector(`.center-card[data-id="${center.id}"]`).style.display = 
                    show ? 'block' : 'none';
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RecyclingCenterLocator();
}); 