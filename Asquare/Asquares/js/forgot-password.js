import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

class ForgotPasswordHandler {
    constructor() {
        this.auth = getAuth();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const resetForm = document.getElementById('resetPasswordForm');
        if (resetForm) {
            resetForm.addEventListener('submit', this.handleResetPassword.bind(this));
        }
    }

    async handleResetPassword(event) {
        event.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        const submitButton = event.target.querySelector('button[type="submit"]');
        const spinner = submitButton.querySelector('.spinner-border');
        
        try {
            // Show loading state
            this.toggleLoading(true, submitButton, spinner);
            
            // Send password reset email
            await sendPasswordResetEmail(this.auth, email);
            
            // Show success message
            this.showAlert('success', 'Password reset email sent! Please check your inbox.');
            
            // Clear the form
            event.target.reset();
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.showAlert('danger', this.getErrorMessage(error));
        } finally {
            this.toggleLoading(false, submitButton, spinner);
        }
    }

    toggleLoading(isLoading, button, spinner) {
        button.disabled = isLoading;
        if (isLoading) {
            spinner.classList.remove('d-none');
            button.textContent = ' Sending...';
        } else {
            spinner.classList.add('d-none');
            button.textContent = 'Send Reset Link';
        }
    }

    showAlert(type, message) {
        const alertPlaceholder = document.getElementById('alertPlaceholder');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        alertPlaceholder.innerHTML = '';
        alertPlaceholder.append(wrapper);
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later.';
            default:
                return 'An error occurred. Please try again.';
        }
    }
}

// Initialize handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ForgotPasswordHandler();
}); 