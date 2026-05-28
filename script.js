/* ======================================================
   SCRIPT.JS — Web GIS Pertanahan Karangdowo
   Landing Page Scripts
   ====================================================== */

/* ===== NAVBAR SCROLL EFFECT ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    updateActiveNavLink();
});

/* ===== MOBILE MENU ===== */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.style.display === 'flex';
    mobileMenu.style.display = isOpen ? 'none' : 'flex';
});

function closeMobileMenu() {
    mobileMenu.style.display = 'none';
}

/* ===== ACTIVE NAV LINK ON SCROLL ===== */
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) {
            if (scrollPos >= top && scrollPos < bottom) {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        }
    });
}

/* ===== COUNTER ANIMATION ===== */
function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * ease);

        if (target >= 1000) {
            el.textContent = current.toLocaleString('id-ID') + suffix;
        } else {
            el.textContent = current + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

/* ===== INTERSECTION OBSERVER ===== */
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.dataset.target) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('[data-target]').forEach(el => {
    counterObserver.observe(el);
});

/* ===== FADE IN ON SCROLL ===== */
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, entry.target.dataset.delay || 0);
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

function initFadeAnimations() {
    const animElements = document.querySelectorAll(
        '.qs-card, .fitur-card, .kg-card, .berita-card, .kontak-card, .stat-card, .pl-card, .tf-item'
    );
    animElements.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.dataset.delay = (i % 4) * 80;
        fadeObserver.observe(el);
    });
}

/* ===== SMOOTH ANCHOR SCROLL ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
    initFadeAnimations();
    updateActiveNavLink();
});
