import { authService } from './auth-service.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

class AuthHandlers {
    constructor() {
        this.auth = getAuth();
        this.googleProvider = new GoogleAuthProvider();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Signup form handler
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', this.handleSignup.bind(this));
        }

        // Login form handler
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Google auth handlers
        const googleSignIn = document.getElementById('googleSignIn');
        if (googleSignIn) {
            googleSignIn.addEventListener('click', this.handleGoogleAuth.bind(this));
        }

        const googleSignUp = document.getElementById('googleSignUp');
        if (googleSignUp) {
            googleSignUp.addEventListener('click', this.handleGoogleAuth.bind(this));
        }
    }

    async handleGoogleAuth(event) {
        event.preventDefault();
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            const user = result.user;
            
            // Check if this is a new user
            if (result.additionalUserInfo?.isNewUser) {
                // Create user profile
                await authService.createUserProfile(user.uid, {
                    email: user.email,
                    name: user.displayName,
                    userType: 'individual', // Default type for Google auth
                    createdAt: new Date().toISOString(),
                    stats: {
                        totalRecycled: 0,
                        carbonSaved: 0,
                        treesPreserved: 0
                    }
                });
            }

            // Show success message and redirect
            this.showAlert('success', 'Successfully signed in with Google!');
            setTimeout(() => {
                window.location.href = '/profile.html';
            }, 1500);

        } catch (error) {
            console.error('Google auth error:', error);
            this.showAlert('danger', this.getErrorMessage(error));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            this.toggleLoadingState(true, 'loginForm');
            const user = await authService.login(email, password);
            
            if (rememberMe) {
                // Set persistence to LOCAL
                await this.auth.setPersistence('LOCAL');
            }

            this.showAlert('success', 'Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = '/profile.html';
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('danger', this.getErrorMessage(error));
        } finally {
            this.toggleLoadingState(false, 'loginForm');
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        
        // Get form values
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const userType = document.getElementById('userType').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        try {
            // Validate form
            if (!this.validateSignupForm(name, email, userType, password, confirmPassword)) {
                return;
            }

            // Show loading state
            this.toggleLoadingState(true);

            // Register user
            const user = await authService.register(email, password, userType, name);
            
            // Show success message
            this.showAlert('success', 'Account created successfully! Redirecting to profile...');
            
            // Redirect to profile page
            setTimeout(() => {
                window.location.href = '/profile.html';
            }, 2000);

        } catch (error) {
            console.error('Signup error:', error);
            this.showAlert('danger', this.getErrorMessage(error));
        } finally {
            this.toggleLoadingState(false);
        }
    }

    validateSignupForm(name, email, userType, password, confirmPassword) {
        // Clear previous errors
        this.clearErrors();

        let isValid = true;

        // Name validation
        if (name.length < 2) {
            this.showFieldError('signupName', 'Name must be at least 2 characters long');
            isValid = false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showFieldError('signupEmail', 'Please enter a valid email address');
            isValid = false;
        }

        // User type validation
        if (!userType) {
            this.showFieldError('userType', 'Please select an account type');
            isValid = false;
        }

        // Password validation
        if (password.length < 6) {
            this.showFieldError('signupPassword', 'Password must be at least 6 characters long');
            isValid = false;
        }

        // Confirm password validation
        if (password !== confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwords do not match');
            isValid = false;
        }

        return isValid;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.classList.add('is-invalid');
        field.parentNode.appendChild(errorDiv);
    }

    clearErrors() {
        document.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(error => {
            error.remove();
        });
    }

    showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const modalBody = document.querySelector('.modal-body');
        modalBody.insertBefore(alertDiv, modalBody.firstChild);
    }

    toggleLoadingState(isLoading) {
        const submitButton = document.querySelector('#signupForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.innerHTML = isLoading ? 
                '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating account...' : 
                'Create Account';
        }
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please use a different email or login.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/operation-not-allowed':
                return 'Account creation is currently disabled. Please try again later.';
            case 'auth/weak-password':
                return 'Please choose a stronger password.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/popup-closed-by-user':
                return 'Google sign-in was cancelled. Please try again.';
            default:
                return 'An error occurred. Please try again.';
        }
    }
}

// Initialize auth handlers
document.addEventListener('DOMContentLoaded', () => {
    new AuthHandlers();
}); 