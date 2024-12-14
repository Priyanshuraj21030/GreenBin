import { getAuth } from 'firebase/auth';
import { getDatabase, ref, push, serverTimestamp } from 'firebase/database';

class PickupScheduler {
    constructor() {
        this.auth = getAuth();
        this.db = getDatabase();
        this.selectedWasteType = null;
        this.selectedTime = null;
        this.userLocation = null;
        this.map = null;
        this.marker = null;
        this.gallery = [];
        this.currentImageIndex = 0;
        
        try {
            this.initializeMap();
            this.initializeDatePicker();
            this.setupEventListeners();
            this.setupWasteImageUpload();
            this.setupGallery();
        } catch (error) {
            this.handleError(error, this.errors.MAP_LOAD);
        }
    }
    
    initializeMap() {
        // Hide loading indicator once map is loaded
        google.maps.event.addListenerOnce(this.map, 'tilesloaded', () => {
            document.getElementById('mapLoading').style.display = 'none';
        });
        
        // Initialize location status element
        this.locationStatus = document.querySelector('.location-status');
        
        const mapOptions = {
            zoom: 2,
            center: { lat: 0, lng: 0 },
            mapTypeControl: true,
            fullscreenControl: false,
            streetViewControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            }
        };
        
        this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
        this.setupLocationServices();
    }
    
    setupLocationServices() {
        // Setup current location button
        document.getElementById('useCurrentLocation').addEventListener('click', () => {
            this.getCurrentLocation();
        });
        
        // Watch position if permission is granted
        if (navigator.geolocation) {
            navigator.permissions.query({ name: 'geolocation' }).then(result => {
                if (result.state === 'granted') {
                    this.watchUserLocation();
                }
            });
        }
    }
    
    watchUserLocation() {
        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Update accuracy radius
                const accuracy = position.coords.accuracy;
                this.updateLocationAccuracy(pos, accuracy);
                
                // Update location status
                this.showLocationStatus('success', 'GPS location active');
            },
            (error) => {
                this.handleLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
    
    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showLocationStatus('danger', 'Geolocation is not supported by your browser');
            return;
        }
        
        this.showLocationStatus('info', 'Getting your location...');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                this.map.setCenter(pos);
                this.map.setZoom(17);
                this.addMarker(pos);
                this.reverseGeocode(pos);
                
                // Show accuracy radius
                this.updateLocationAccuracy(pos, position.coords.accuracy);
                
                this.showLocationStatus('success', 'Location found successfully');
            },
            (error) => {
                this.handleLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    updateLocationAccuracy(position, accuracy) {
        // Remove old accuracy circle if it exists
        if (this.accuracyCircle) {
            this.accuracyCircle.setMap(null);
        }
        
        // Create new accuracy circle
        this.accuracyCircle = new google.maps.Circle({
            map: this.map,
            center: position,
            radius: accuracy,
            fillColor: '#4285F4',
            fillOpacity: 0.2,
            strokeColor: '#4285F4',
            strokeOpacity: 0.4,
            strokeWeight: 1
        });
    }
    
    handleLocationError(error) {
        const errorMessages = {
            1: this.errors.LOCATION_DENIED,
            2: this.errors.LOCATION_UNAVAILABLE,
            3: this.errors.LOCATION_TIMEOUT
        };
        
        const message = errorMessages[error.code] || this.errors.UNKNOWN;
        this.handleError(error, message);
    }
    
    showLocationStatus(type, message) {
        this.locationStatus.className = `location-status alert alert-${type} d-block`;
        this.locationStatus.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 
                           type === 'danger' ? 'exclamation-circle' : 
                           'info-circle'} me-2"></i>${message}
        `;
    }
    
    addMarker(position) {
        if (this.marker) {
            this.marker.setMap(null);
        }
        // Clear accuracy circle when manually placing marker
        if (this.accuracyCircle) {
            this.accuracyCircle.setMap(null);
        }
        
        this.marker = new google.maps.Marker({
            position,
            map: this.map,
            draggable: true,
            animation: google.maps.Animation.DROP
        });
        
        this.marker.addListener('dragend', () => {
            const pos = {
                lat: this.marker.getPosition().lat(),
                lng: this.marker.getPosition().lng()
            };
            this.reverseGeocode(pos);
            this.userLocation = pos;
        });
    }
    
    reverseGeocode(position) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: position }).then(response => {
            if (response.results[0]) {
                document.getElementById('address').value = response.results[0].formatted_address;
            } else {
                throw new Error(this.errors.GEOCODE_FAILED);
            }
        }).catch(error => {
            this.handleError(error, this.errors.GEOCODE_FAILED);
        });
    }
    
    initializeDatePicker() {
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 30); // Allow booking up to 30 days in advance
        
        flatpickr("#pickupDate", {
            minDate: "today",
            maxDate: maxDate,
            dateFormat: "Y-m-d",
            disableMobile: true,
            disable: [
                function(date) {
                    // Disable Sundays
                    return date.getDay() === 0;
                }
            ],
            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    this.updateAvailableTimeSlots(selectedDates[0]);
                }
            }
        });
    }
    
    updateAvailableTimeSlots(selectedDate) {
        const timeSlots = document.querySelectorAll('.time-slot');
        const today = new Date();
        const isToday = selectedDate.toDateString() === today.toDateString();
        const currentHour = today.getHours();
        
        timeSlots.forEach(slot => {
            const slotHour = parseInt(slot.dataset.time.split(':')[0]);
            
            if (isToday && slotHour <= currentHour + 2) {
                // Disable time slots that are less than 2 hours from now
                slot.classList.add('disabled');
                if (slot.classList.contains('selected')) {
                    slot.classList.remove('selected');
                    this.selectedTime = null;
                }
            } else {
                slot.classList.remove('disabled');
            }
        });
    }
    
    setupEventListeners() {
        // Waste type selection
        document.querySelectorAll('.waste-type-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.waste-type-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedWasteType = card.dataset.type;
                this.updateProgress();
            });
        });
        
        // Time slot selection
        const timeSlots = document.querySelectorAll('.time-slot');
        
        timeSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                if (!document.getElementById('pickupDate').value) {
                    alert('Please select a date first');
                    return;
                }
                
                if (slot.classList.contains('disabled')) {
                    return;
                }
                
                // Remove selected class from all slots
                timeSlots.forEach(s => s.classList.remove('selected'));
                
                // Add selected class to clicked slot
                slot.classList.add('selected');
                
                // Update the selected time
                this.selectedTime = slot.dataset.time;
                document.getElementById('selectedTime').value = this.selectedTime;
                
                this.updateProgress();
            });
        });
        
        // Form submission
        document.getElementById('pickupForm').addEventListener('submit', this.handleSubmit.bind(this));
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        try {
            // Validate all required fields
            const validationErrors = this.validateForm();
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('<br>'));
            }
            
            if (!this.auth.currentUser) {
                this.handleError(new Error('Authentication required'), 'Please login to schedule a pickup', true);
                window.location.href = '/login.html';
                return;
            }
            
            const submitButton = event.target.querySelector('button[type="submit"]');
            const spinner = submitButton.querySelector('.spinner-border');
            
            try {
                this.toggleLoading(true, submitButton, spinner);
                
                const pickupData = {
                    userId: this.auth.currentUser.uid,
                    wasteType: this.selectedWasteType,
                    location: this.userLocation,
                    address: document.getElementById('address').value,
                    landmark: document.getElementById('landmark').value,
                    date: document.getElementById('pickupDate').value,
                    time: this.selectedTime,
                    notes: document.getElementById('notes').value,
                    status: 'pending',
                    createdAt: serverTimestamp()
                };
                
                // Save to Firebase
                await push(ref(this.db, 'pickups'), pickupData);
                
                // Show success message
                this.showSuccessMessage('Pickup scheduled successfully!');
                window.location.href = '/dashboard.html';
                
            } catch (error) {
                this.handleError(error, 'Error scheduling pickup. Please try again.', true);
            } finally {
                this.toggleLoading(false, submitButton, spinner);
            }
        }
    }
    
    toggleLoading(isLoading, button, spinner) {
        button.disabled = isLoading;
        if (isLoading) {
            spinner.classList.remove('d-none');
            button.textContent = ' Scheduling...';
        } else {
            spinner.classList.add('d-none');
            button.textContent = 'Schedule Pickup';
        }
    }
    
    updateProgress() {
        const totalSteps = 4; // Total number of steps
        let completedSteps = 0;
        
        // Check each step completion
        if (this.selectedWasteType) completedSteps++;
        if (this.userLocation && document.getElementById('address').value) completedSteps++;
        if (document.getElementById('pickupDate').value && this.selectedTime) completedSteps++;
        if (document.getElementById('notes').value) completedSteps++;
        
        // Update progress bar if it exists
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            const progress = (completedSteps / totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    handleError(error, customMessage = '', isAlert = false) {
        const errorMessage = customMessage || error.message || this.errors.UNKNOWN;
        console.error('Error:', error);
        
        if (isAlert) {
            // Show alert for critical errors
            const alertHtml = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    ${errorMessage}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            const alertContainer = document.createElement('div');
            alertContainer.innerHTML = alertHtml;
            document.querySelector('.schedule-container').prepend(alertContainer);
        } else {
            // Show inline error message
            this.showLocationStatus('danger', errorMessage);
        }
        
        // Log to analytics or error tracking service
        this.logError(error, errorMessage);
    }
    
    logError(error, context) {
        // Implement error logging to your analytics service
        console.log('Error logged:', {
            timestamp: new Date().toISOString(),
            error: error.message || error,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }
    
    validateForm() {
        const errors = [];
        
        if (!this.selectedWasteType) {
            errors.push('Please select a waste type');
        }
        
        if (!this.userLocation || !document.getElementById('address').value) {
            errors.push('Please select a pickup location');
        }
        
        if (!document.getElementById('pickupDate').value) {
            errors.push('Please select a pickup date');
        }
        
        if (!this.selectedTime) {
            errors.push('Please select a pickup time');
        }
        
        return errors;
    }
    
    showSuccessMessage(message) {
        const successHtml = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        const alertContainer = document.createElement('div');
        alertContainer.innerHTML = successHtml;
        document.querySelector('.schedule-container').prepend(alertContainer);
    }
    
    setupWasteImageUpload() {
        const uploadButton = document.getElementById('uploadButton');
        const takePhotoButton = document.getElementById('takePhoto');
        const fileInput = document.getElementById('wasteImage');
        const cameraContainer = document.querySelector('.camera-container');
        const cameraPreview = document.getElementById('cameraPreview');
        const captureButton = document.getElementById('capturePhoto');
        const cancelButton = document.getElementById('cancelCamera');
        const imagePreview = document.getElementById('imagePreview');
        const removeButton = document.getElementById('removeImage');
        let stream = null;
        
        uploadButton.addEventListener('click', () => fileInput.click());
        
        takePhotoButton.addEventListener('click', async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });
                
                cameraPreview.srcObject = stream;
                cameraContainer.classList.remove('d-none');
                takePhotoButton.classList.add('d-none');
                uploadButton.classList.add('d-none');
            } catch (error) {
                this.handleError(error, 'Unable to access camera. Please check permissions.');
            }
        });
        
        captureButton.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = cameraPreview.videoWidth;
            canvas.height = cameraPreview.videoHeight;
            canvas.getContext('2d').drawImage(cameraPreview, 0, 0);
            
            canvas.toBlob(blob => {
                this.handleImageUpload(blob);
                this.stopCamera(stream, cameraContainer);
                takePhotoButton.classList.remove('d-none');
                uploadButton.classList.remove('d-none');
            }, 'image/jpeg', 0.8);
        });
        
        cancelButton.addEventListener('click', () => {
            this.stopCamera(stream, cameraContainer);
            takePhotoButton.classList.remove('d-none');
            uploadButton.classList.remove('d-none');
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleImageUpload(e.target.files[0]);
            }
        });
        
        removeButton.addEventListener('click', () => {
            this.clearImagePreview();
        });
    }
    
    stopCamera(stream, cameraContainer) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraContainer.classList.add('d-none');
    }
    
    async handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.handleError(new Error('Invalid file type'), 'Please upload an image file');
            return;
        }

        try {
            // Show image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addToGallery({
                    url: e.target.result,
                    type: file.type,
                    name: file.name
                });
            };
            reader.readAsDataURL(file);

            // Analyze image and suggest waste type
            await this.analyzeWasteImage(file);
        } catch (error) {
            this.handleError(error, 'Error processing image');
        }
    }
    
    async analyzeWasteImage(file) {
        // Here you would integrate with an image recognition API
        // For demonstration, we'll use a mock response
        const mockAnalysis = {
            wasteType: 'recyclable',
            confidence: 0.85,
            suggestions: [
                'This appears to be recyclable material',
                'Please ensure it\'s clean and dry',
                'Remove any non-recyclable parts'
            ]
        };

        this.showWasteSuggestion(mockAnalysis);
    }
    
    showWasteSuggestion(analysis) {
        const suggestionDiv = document.getElementById('wasteSuggestion');
        const suggestionText = suggestionDiv.querySelector('.suggestion-text');
        
        suggestionText.innerHTML = `
            <strong>Suggested Category: ${analysis.wasteType}</strong><br>
            ${analysis.suggestions.join('<br>')}
        `;
        
        suggestionDiv.classList.remove('d-none');
        
        // Auto-select the suggested waste type
        document.querySelector(`.waste-type-card[data-type="${analysis.wasteType}"]`)?.click();
    }
    
    clearImagePreview() {
        this.gallery = [];
        this.updateGalleryView();
        document.getElementById('wasteSuggestion').classList.add('d-none');
        document.getElementById('wasteImage').value = '';
        this.imageFile = null;
    }
    
    setupGallery() {
        const modal = new bootstrap.Modal(document.getElementById('galleryModal'));
        const prevButton = document.getElementById('prevImage');
        const nextButton = document.getElementById('nextImage');
        
        document.getElementById('imageGallery').addEventListener('click', (e) => {
            const galleryItem = e.target.closest('.gallery-item');
            if (galleryItem) {
                this.currentImageIndex = parseInt(galleryItem.dataset.index);
                this.showGalleryImage();
                modal.show();
            }
        });
        
        prevButton.addEventListener('click', () => {
            this.currentImageIndex = (this.currentImageIndex - 1 + this.gallery.length) % this.gallery.length;
            this.showGalleryImage();
        });
        
        nextButton.addEventListener('click', () => {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.gallery.length;
            this.showGalleryImage();
        });
    }
    
    showGalleryImage() {
        const modalImage = document.querySelector('#galleryModal .gallery-container img');
        const counter = document.querySelector('.gallery-counter');
        
        modalImage.src = this.gallery[this.currentImageIndex].url;
        counter.textContent = `${this.currentImageIndex + 1} of ${this.gallery.length}`;
    }
    
    addToGallery(image) {
        this.gallery.push(image);
        this.updateGalleryView();
    }
    
    updateGalleryView() {
        const galleryContainer = document.getElementById('imageGallery');
        galleryContainer.innerHTML = this.gallery.map((image, index) => `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="gallery-item" data-index="${index}">
                    <img src="${image.url}" alt="Waste image ${index + 1}">
                    <div class="remove-image" onclick="event.stopPropagation(); window.pickupScheduler.removeFromGallery(${index})">
                        <i class="bi bi-x"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    removeFromGallery(index) {
        this.gallery.splice(index, 1);
        this.updateGalleryView();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pickupScheduler = new PickupScheduler();
}); 