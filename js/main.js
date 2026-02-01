// ===================================
// GSAP & AOS INITIALIZATION
// =================================== */

gsap.registerPlugin(ScrollTrigger);

// Initialize AOS-like animations with GSAP
const initAnimations = () => {
    // Fade up animations
    gsap.utils.toArray('[data-aos="fade-up"]').forEach((elem, index) => {
        const delay = elem.getAttribute('data-aos-delay') || 0;
        
        gsap.from(elem, {
            y: 60,
            opacity: 0,
            duration: 1,
            delay: delay / 1000,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: elem,
                start: 'top 85%',
            }
        });
    });
    
    // Fade down animations
    gsap.utils.toArray('[data-aos="fade-down"]').forEach((elem) => {
        gsap.from(elem, {
            y: -60,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: elem,
                start: 'top 85%',
            }
        });
    });
};

// ===================================
// CUSTOM CURSOR - DISABLED FOR BETTER UX
// ===================================

// Custom cursor disabled to improve navigation and usability
// Using native browser cursor instead

/*
const cursor = {
    dot: document.querySelector('[data-cursor-dot]'),
    outline: document.querySelector('[data-cursor-outline]'),
    
    init() {
        if (!this.dot || !this.outline) return;
        
        let mouseX = 0, mouseY = 0;
        let dotX = 0, dotY = 0;
        let outlineX = 0, outlineY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        // Smooth cursor movement
        const updateCursor = () => {
            // Dot follows immediately
            dotX += (mouseX - dotX) * 0.8;
            dotY += (mouseY - dotY) * 0.8;
            
            // Outline lags behind
            outlineX += (mouseX - outlineX) * 0.15;
            outlineY += (mouseY - outlineY) * 0.15;
            
            this.dot.style.transform = `translate(${dotX}px, ${dotY}px)`;
            this.outline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
            
            requestAnimationFrame(updateCursor);
        };
        
        updateCursor();
        
        // Hover effects
        const hoverElements = document.querySelectorAll('a, button, .manifesto-item, .stat-item');
        hoverElements.forEach(elem => {
            elem.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-hover');
            });
            elem.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-hover');
            });
        });
    }
};
*/

// ===================================
// PARTICLE CANVAS
// ===================================

class ParticleCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 80;
        this.mouse = { x: null, y: null, radius: 150 };
        
        this.resize();
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    init() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }
    
    drawParticle(particle) {
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(201, 164, 92, ${particle.opacity})`;
        this.ctx.fill();
    }
    
    connectParticles() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 120) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(201, 164, 92, ${0.15 * (1 - distance / 120)})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            // Mouse interaction
            if (this.mouse.x && this.mouse.y) {
                const dx = this.mouse.x - particle.x;
                const dy = this.mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.mouse.radius) {
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    particle.x -= (dx / distance) * force * 2;
                    particle.y -= (dy / distance) * force * 2;
                }
            }
            
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.speedY *= -1;
            
            // Keep within bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            
            this.drawParticle(particle);
        });
        
        this.connectParticles();
        requestAnimationFrame(() => this.animate());
    }
}

// ===================================
// PAGE LOADER
// ===================================

const pageLoader = {
    element: document.querySelector('.page-loader'),
    
    hide() {
        setTimeout(() => {
            if (this.element) {
                this.element.classList.add('hidden');
                document.body.style.overflow = 'visible';
            }
        }, 1500);
    }
};

// ===================================
// NAVBAR SCROLL EFFECT
// ===================================

const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// ===================================
// MOBILE MENU
// ===================================

const mobileMenu = {
    toggle: document.getElementById('mobileMenuToggle'),
    menu: document.getElementById('mobileMenu'),
    
    init() {
        if (!this.toggle || !this.menu) return;
        
        this.toggle.addEventListener('click', () => {
            this.toggle.classList.toggle('active');
            this.menu.classList.toggle('active');
            document.body.style.overflow = this.menu.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close on link click
        this.menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                this.toggle.classList.remove('active');
                this.menu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Close on overlay click
        this.menu.querySelector('.mobile-menu-overlay').addEventListener('click', () => {
            this.toggle.classList.remove('active');
            this.menu.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
};

// ===================================
// SMOOTH SCROLL
// ===================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const offsetTop = target.offsetTop - 100;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Counter animation removed - no longer needed

// ===================================
// SECTION REVEAL ANIMATIONS
// ===================================

const revealSections = () => {
    const sections = document.querySelectorAll('.freedom-item, .ecfs-pillar, .mechanic-card, .membership-card, .path-step');
    
    sections.forEach((section, index) => {
        gsap.from(section, {
            y: 80,
            opacity: 0,
            duration: 1,
            delay: index * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
            }
        });
    });
};

// ===================================
// PARALLAX EFFECTS
// ===================================

const initParallax = () => {
    gsap.to('.hero-background', {
        y: 200,
        ease: 'none',
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });
};

// ===================================
// INITIALIZE EVERYTHING
// ===================================

window.addEventListener('DOMContentLoaded', () => {
    // Hide loader
    pageLoader.hide();
    
    // Custom cursor disabled for better UX
    // cursor.init();
    
    // Initialize particle canvas
    new ParticleCanvas('particleCanvas');
    
    // Initialize mobile menu
    mobileMenu.init();
    
    // Initialize animations
    initAnimations();
    revealSections();
    initParallax();
    
    console.log('%cEkantik Capital Advisors', 'font-size: 24px; font-weight: bold; color: #E0A930; font-family: serif;');
    console.log('%cPremium Landing Page Loaded - Native Cursor Enabled', 'font-size: 14px; color: #9CA3AF;');
});

// ===================================
// RESIZE HANDLER
// ===================================

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
    }, 250);
});

// ===================================
// CONTACT FORM
// ===================================

const contactForm = document.getElementById('contactForm');
const successModal = document.getElementById('successModal');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            assets: document.getElementById('assets').value,
            message: document.getElementById('message').value,
            timestamp: new Date().toISOString()
        };
        
        const submitBtn = contactForm.querySelector('.form-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Submitting...</span>';
        submitBtn.disabled = true;
        
        try {
            // Simulate API call (replace with actual endpoint)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            console.log('Form submitted:', formData);
            
            // Show success modal
            successModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Reset form
            contactForm.reset();
            
        } catch (error) {
            console.error('Form submission error:', error);
            alert('There was an error submitting your application. Please try again.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Close modal function
window.closeModal = function() {
    successModal.classList.remove('active');
    document.body.style.overflow = '';
};

// Close modal on overlay click
if (successModal) {
    successModal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && successModal.classList.contains('active')) {
        closeModal();
    }
});

// ===================================
// EXPENSE PYRAMID LIGHTBOX
// ===================================

// ===================================
// PHILOSOPHY IMAGE LIGHTBOX
// ===================================

// ===================================
// EPIG 500 BACKTEST SNAPSHOT BUTTON
// ===================================

const viewBacktestBtn = document.getElementById('viewBacktestBtn');

if (viewBacktestBtn) {
    viewBacktestBtn.addEventListener('click', function() {
        const backtestBox = document.querySelector('.epig500-backtest-box');
        if (backtestBox) {
            // Smooth scroll to the backtest snapshot
            backtestBox.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Add highlight animation
            backtestBox.style.animation = 'pulse 1.5s ease-in-out';
            setTimeout(() => {
                backtestBox.style.animation = '';
            }, 1500);
        }
    });
}

// Add pulse animation to CSS if not already present
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(224, 169, 48, 0.7);
        }
        50% {
            transform: scale(1.02);
            box-shadow: 0 0 0 10px rgba(224, 169, 48, 0);
        }
    }
`;
document.head.appendChild(style);

// ===================================
// EPIG 500 COMPARISON IMAGE LIGHTBOX
// ===================================

const comparisonLightbox = {
    modal: document.getElementById('comparisonLightbox'),
    lightboxImage: document.getElementById('comparisonLightboxImage'),
    closeBtn: document.getElementById('comparisonLightboxClose'),
    overlay: document.getElementById('comparisonLightboxOverlay'),
    imageWrapper: null,
    
    init() {
        this.imageWrapper = document.querySelector('.comparison-image-wrapper');
        
        if (this.imageWrapper && this.modal) {
            // Open lightbox on image click
            this.imageWrapper.addEventListener('click', () => {
                this.open();
            });
            
            // Close lightbox on close button click
            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => {
                    this.close();
                });
            }
            
            // Close lightbox on overlay click
            if (this.overlay) {
                this.overlay.addEventListener('click', () => {
                    this.close();
                });
            }
            
            // Close lightbox on ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                    this.close();
                }
            });
        }
    },
    
    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // GSAP animation
            if (typeof gsap !== 'undefined') {
                gsap.to(this.modal, {
                    opacity: 1,
                    duration: 0.3
                });
                
                gsap.from(this.lightboxImage, {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.4,
                    delay: 0.1
                });
            }
        }
    },
    
    close() {
        if (this.modal) {
            if (typeof gsap !== 'undefined') {
                gsap.to(this.modal, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => {
                        this.modal.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
            } else {
                this.modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    }
};

// Initialize comparison lightbox
comparisonLightbox.init();

// ===================================
// FAQ ACCORDION - DISABLED (now using faq-grouped.js for grouped FAQ functionality)
// ===================================

/*
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    console.log('FAQ Accordion initialized with', faqItems.length, 'items');
    
    faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (question && answer) {
            // Add click event with explicit handling
            question.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('FAQ item clicked:', index + 1);
                
                const isActive = item.classList.contains('active');
                
                // Close all other FAQ items
                faqItems.forEach((otherItem) => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    console.log('FAQ item closed:', index + 1);
                } else {
                    item.classList.add('active');
                    console.log('FAQ item opened:', index + 1);
                    
                    // Smooth scroll to the item if it's being opened
                    setTimeout(() => {
                        const rect = item.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const itemTop = rect.top + scrollTop - 100; // 100px offset for navbar
                        
                        window.scrollTo({
                            top: itemTop,
                            behavior: 'smooth'
                        });
                    }, 300); // Wait for accordion animation
                }
            });
            
            // Also add touch event for mobile
            question.addEventListener('touchend', function(e) {
                e.preventDefault();
                question.click();
            });
            
            console.log('FAQ item', index + 1, 'initialized');
        } else {
            console.warn('FAQ item', index + 1, 'missing question or answer element');
        }
    });
});
*/
