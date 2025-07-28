var TxtType = function(el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = '';
    this.tick();
    this.isDeleting = false;
};

TxtType.prototype.tick = function() {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];

    if (this.isDeleting) {
        this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
        this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>';

    var that = this;
    var delta = 127 - Math.random() * 64;

    if (this.isDeleting) { 
        delta /= 4.7; 
    }

    if (!this.isDeleting && this.txt === fullTxt) {
        delta = this.period;
        this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
        this.isDeleting = false;
        this.loopNum++;
        delta = 500;
    }

    setTimeout(function() {
        that.tick();
    }, delta);
};

// Animation control variables
let animationPaused = false;
let emailSubmitted = false;

// Animation control functions
function pauseAnimations() {
    animationPaused = true;
    const sendIcon = document.querySelector('.send-button svg');
    const text1 = document.querySelector('.beta-text-1');
    const text2 = document.querySelector('.beta-text-2');
    
    // Force clean state: icon visible, "Get early access" visible, other text hidden
    if (sendIcon) {
        sendIcon.style.animation = 'none';
        sendIcon.style.opacity = '1';
        sendIcon.style.transform = 'translateX(0)';
    }
    
    if (text1) {
        text1.style.animation = 'none';
        text1.style.opacity = '0.8';
        text1.style.transform = 'translateX(0)';
    }
    
    if (text2) {
        text2.style.animation = 'none';
        text2.style.opacity = '0';
        text2.style.transform = 'translateX(-20px)';
    }
}

function resumeAnimations() {
    if (emailSubmitted) return; // Don't resume if email was submitted
    
    animationPaused = false;
    const sendIcon = document.querySelector('.send-button svg');
    const text1 = document.querySelector('.beta-text-1');
    const text2 = document.querySelector('.beta-text-2');
    
    // Restart animations from scratch
    if (sendIcon) {
        sendIcon.style.animation = 'icon-slide-cycle 8s ease-in-out infinite';
    }
    
    if (text1) {
        text1.style.animation = 'text-cycle-1 8s ease-in-out infinite';
    }
    
    if (text2) {
        text2.style.animation = 'text-cycle-2 8s ease-in-out infinite';
    }
}

function stopAnimations() {
    emailSubmitted = true;
    const sendIcon = document.querySelector('.send-button svg');
    const text1 = document.querySelector('.beta-text-1');
    const text2 = document.querySelector('.beta-text-2');
    
    if (sendIcon) {
        sendIcon.style.animation = 'none';
        sendIcon.style.opacity = '1';
        sendIcon.style.transform = 'translateX(0)';
    }
    
    // Show "You're all set!" message
    if (text1) {
        text1.textContent = "You're all set! ✨";
        text1.style.animation = 'none';
        text1.style.opacity = '0.9';
        text1.style.transform = 'translateX(0)';
    }
    
    if (text2) {
        text2.style.animation = 'none';
        text2.style.opacity = '0';
        text2.style.transform = 'translateX(-20px)';
    }
}

// Email validation and interaction handling
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function updateValidationFeedback(email, isValid, isEmpty = false) {
    const feedback = document.querySelector('.validation-feedback');
    
    // Remove existing classes
    feedback.classList.remove('show', 'valid', 'invalid');
    
    if (isEmpty) {
        feedback.textContent = '';
        return;
    }
    
    if (isValid) {
        feedback.classList.add('show', 'valid');
        feedback.textContent = '✓ Looks good!';
    } else if (email.length > 0) {
        feedback.classList.add('show', 'invalid');
        feedback.textContent = 'Please check your email format';
    }
}

function updateSignupCounter() {
    const counter = document.getElementById('signup-counter');
    if (!counter) return;
    
    const currentCount = parseInt(counter.textContent);
    const newCount = currentCount + 1;
    
    // Animate the counter change
    counter.style.transform = 'scale(1.2)';
    counter.style.color = '#22c55e';
    
    setTimeout(() => {
        counter.textContent = newCount;
        
        setTimeout(() => {
            counter.style.transform = 'scale(1)';
            counter.style.color = 'inherit';
        }, 150);
    }, 100);
}

function showError(message, type = 'error') {
    const errorElement = document.querySelector('.error-message');
    errorElement.textContent = message;
    
    // Apply different styling based on type
    if (type === 'success') {
        errorElement.className = 'success-message';
    } else {
        errorElement.className = 'error-message';
    }
    
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

function shakeInput(input) {
    // Add shake class
    input.classList.add('shake-error');
    
    // Remove shake class after animation completes
    setTimeout(() => {
        input.classList.remove('shake-error');
    }, 600);
}

function handleSubmit() {
    const emailInput = document.querySelector('.email-input');
    const email = emailInput.value.trim();
    
    if (!email) {
        // Clear validation feedback first
        updateValidationFeedback('', false, true);
        showError('Please click above and then enter your email address');
        return;
    }
    
    if (!isValidEmail(email)) {
        // Just shake the input - validation feedback already shows "Please check your email format"
        shakeInput(emailInput);
        return;
    }
    
    // Store email in localStorage (temporary - replace with backend)
    // TO ACCESS: Open browser dev tools → Application → Local Storage → see 'earlyAccessEmail'
    // FOR PRODUCTION: Replace with backend service (Mailchimp, ConvertKit, etc.)
    console.log('Email captured:', email);
    localStorage.setItem('earlyAccessEmail', email);
    
    // Stop animations after successful submission
    stopAnimations();
    
    // Add success state to button
    const sendButton = document.querySelector('.send-button');
    sendButton.classList.add('success');
    
    // Clear validation feedback
    updateValidationFeedback('', false, true);
    
    // Update signup counter with animation
    updateSignupCounter();
    
    // Success feedback
    showError('Thanks! We\'ll be in touch soon ✨', 'success');
    
    // Animate email sliding up and fading
    emailInput.classList.add('slide-up');
    
    // Clear input after slide-up animation
    setTimeout(() => {
        emailInput.value = '';
        emailInput.classList.remove('slide-up');
    }, 500);
    
    // Switch back to typewriter after showing success message
    setTimeout(() => {
        switchToTypewriter();
        // Keep the success class to maintain green gradient and checkmark
    }, 2000);
}

function switchToInput() {
    const typewriter = document.querySelector('.typewrite');
    const emailInput = document.querySelector('.email-input');
    
    typewriter.style.display = 'none';
    emailInput.style.display = 'block';
    emailInput.focus();
    
    // Add Enter key listener if not already added
    if (!emailInput.hasAttribute('data-enter-listener')) {
        emailInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSubmit();
            }
        });
        emailInput.setAttribute('data-enter-listener', 'true');
    }
}

function switchToTypewriter() {
    const typewriter = document.querySelector('.typewrite');
    const emailInput = document.querySelector('.email-input');
    
    emailInput.style.display = 'none';
    typewriter.style.display = 'inline';
}




// Fix hover states after tab switching
function reinitializeAnimations() {
    const sendButton = document.querySelector('.send-button');
    const sendIcon = document.querySelector('.send-icon');
    
    if (sendButton && sendIcon && !sendButton.classList.contains('success')) {
        // Force restart animations by removing and re-adding them
        sendIcon.style.animation = 'none';
        void sendIcon.offsetHeight; // Trigger reflow
        sendIcon.style.animation = 'icon-slide-cycle 8s ease-in-out infinite';
    }
}

// Listen for tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Tab became visible again
        setTimeout(reinitializeAnimations, 100);
    }
});

// Also reinitialize on focus
window.addEventListener('focus', () => {
    setTimeout(reinitializeAnimations, 100);
});

// Scroll animation for feature cards
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    const features = document.querySelectorAll('.feature-card');
    features.forEach((feature, index) => {
        // Add staggered delay for animation
        setTimeout(() => {
            observer.observe(feature);
        }, index * 100);
    });
}


window.onload = function() {
    var elements = document.getElementsByClassName('typewrite');
    for (var i = 0; i < elements.length; i++) {
        var toRotate = elements[i].getAttribute('data-type');
        var period = elements[i].getAttribute('data-period');
        if (toRotate) {
            new TxtType(elements[i], JSON.parse(toRotate), period);
        }
    }
    
    
    // Add click handler to switch to input
    const messageContainer = document.querySelector('.message-input-container');
    if (messageContainer) {
        messageContainer.addEventListener('click', switchToInput);
    }
    
    
    // Add click outside handler to resume animations
    document.addEventListener('click', function(event) {
        const messageComposer = document.querySelector('.message-composer');
        const emailInput = document.querySelector('.email-input');
        
        // If click is outside message composer and email input is not currently focused
        if (!messageComposer.contains(event.target) && document.activeElement !== emailInput) {
            resumeAnimations();
        }
    });
    
    // Add email input event handlers
    const emailInput = document.querySelector('.email-input');
    
    // Focus handler - pause animations
    emailInput.addEventListener('focus', function() {
        pauseAnimations();
    });
    
    // Input handler - real-time validation
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        const isValid = isValidEmail(email);
        updateValidationFeedback(email, isValid, email.length === 0);
    });
    
    // Blur handler - resume animations if empty, switch back if empty
    emailInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            updateValidationFeedback('', false, true);
            switchToTypewriter();
            resumeAnimations();
        }
    });
    
    // Initialize scroll animations
    observeElements();
    
    
    // INJECT CSS for cursor
    var css = document.createElement("style");
    css.type = "text/css";
    css.innerHTML = `
        .typewrite > .wrap { 
            border-right: 0.08em solid #1f2937;
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { border-color: transparent; }
            51%, 100% { border-color: currentColor; }
        }
    `;
    document.body.appendChild(css);
};