// ========== HCI-Inspired Interactions ==========

// Mobile navigation
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        const bars = navToggle.querySelectorAll('.bar');
        if (bars.length === 3) {
            if (navMenu.classList.contains('active')) {
                bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                bars.forEach(bar => {
                    bar.style.transform = 'none';
                    bar.style.opacity = '1';
                });
            }
        }
    });
}

// Close mobile menu on link click
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu) navMenu.classList.remove('active');
        const bars = navToggle?.querySelectorAll('.bar');
        bars?.forEach(bar => {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        });
    });
});

// Page transition on load
document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        document.body.classList.add('ready');
    });
});

// Staggered reveal - HCI principle: progressive disclosure
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, {
    threshold: 0.08,
    rootMargin: '0px 0px -30px 0px'
});

document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));

// Active navigation link based on current page
function setActiveNavLink() {
    const path = window.location.pathname || window.location.href;
    const currentPage = path.split('/').pop() || path.split('\\').pop() || 'index.html';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href') || '';
        const linkPage = href.split('/').pop();
        const isActive = linkPage === currentPage || 
            (href === 'index.html' && (currentPage === 'index.html' || currentPage === '' || path.endsWith('/')));
        if (isActive) link.classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', setActiveNavLink);

// Navbar subtle elevation on scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    const scrollY = window.scrollY;
    if (scrollY > 20) {
        navbar.style.boxShadow = '0 2px 20px rgba(45, 42, 38, 0.06)';
    } else {
        navbar.style.boxShadow = 'none';
    }
    lastScroll = scrollY;
}, { passive: true });

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Contact form (if present)
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = this.querySelector('input[type="text"]')?.value;
        const email = this.querySelector('input[type="email"]')?.value;
        const message = this.querySelector('textarea')?.value;
        
        if (!name || !email || !message) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        showNotification('Sending message...', 'info');
        
        setTimeout(() => {
            showNotification('Message sent successfully. I will get back to you soon.', 'success');
            this.reset();
        }, 2000);
    });
}

function showNotification(message, type = 'info') {
    document.querySelector('.notification')?.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${type === 'success' ? '#5B9A8B' : type === 'error' ? '#C45C5C' : '#5A5651'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 24px rgba(45, 42, 38, 0.12);
        z-index: 10000;
        font-size: 0.95rem;
        font-weight: 500;
        animation: notificationIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes notificationIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
}

// Stats animation (if present)
const statsSection = document.querySelector('.about-stats');
if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.stat-number').forEach(stat => {
                    const target = parseInt(stat.textContent.replace('+', '')) || 0;
                    if (target > 0) animateValue(stat, 0, target, 800);
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statsObserver.observe(statsSection);
}

function animateValue(el, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(start + (end - start) * eased);
        el.textContent = current + (el.textContent.includes('+') ? '+' : '');
        
        if (progress < 1) requestAnimationFrame(update);
    }
    
    requestAnimationFrame(update);
}

// Link prefetch for smoother navigation (internal pages)
document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.endsWith('.html') && !href.includes('#')) {
        const prefetch = document.createElement('link');
        prefetch.rel = 'prefetch';
        prefetch.href = href;
        document.head.appendChild(prefetch);
    }
});
