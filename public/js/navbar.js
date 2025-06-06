/**
 * Gestor del estado activo del navbar
 * Mantiene sincronizado el estado visual con la página actual
 */
class NavbarManager {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.navbarBrand = document.querySelector('.navbar-brand');
        this.currentPage = this.getCurrentPage();
        this.currentHash = window.location.hash;
        this.init();
    }

    init() {
        // Establecer el enlace activo basado en la página actual
        this.setActiveFromCurrentPage();

        // Verificar si estamos en la sección projects
        this.checkProjectsSection();

        // Agregar listeners para clics (opcional, si quieres efectos inmediatos)
        this.addClickListeners();

        // Escuchar cambios en el hash de la URL
        window.addEventListener('hashchange', () => {
            this.currentHash = window.location.hash;
            this.checkProjectsSection();
        });
    }

    /**
     * Obtiene el nombre de la página actual
     * @returns {string} Nombre del archivo HTML actual
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';

        // Si la URL no tiene archivo específico, asumimos index.html
        return page.includes('.html') ? page : 'index.html';
    }

    /**
     * Verifica si estamos en la sección de proyectos y activa el navbar-brand
     */
    checkProjectsSection() {
        const isProjectsSection = this.currentPage === 'my_cv.html' &&
            this.currentHash === '#projects-section';

        if (isProjectsSection) {
            this.setNavbarBrandActive(true);
            // Desactivar nav-links cuando projects esté activo
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });
        } else {
            this.setNavbarBrandActive(false);
            // Reactivar el nav-link apropiado
            this.setActiveFromCurrentPage();
        }
    }

    /**
     * Activa o desactiva el navbar-brand
     * @param {boolean} isActive - Si debe estar activo o no
     */
    setNavbarBrandActive(isActive) {
        if (isActive) {
            this.navbarBrand.classList.add('active');
            this.navbarBrand.setAttribute('aria-current', 'page');
        } else {
            this.navbarBrand.classList.remove('active');
            this.navbarBrand.removeAttribute('aria-current');
        }
    }
    /**
     * Establece qué enlace debe estar activo basado en la página actual
     */
    setActiveFromCurrentPage() {
        // No hacer nada si estamos en projects-section
        if (this.currentPage === 'my_cv.html' && this.currentHash === '#projects-section') {
            return;
        }

        // Mapeo de páginas a enlaces
        const pageMap = {
            'index.html': '🧑🏼‍🌾 Farm Game',
            'my_cv.html': '📄 My CV'
        };

        const targetText = pageMap[this.currentPage];

        if (targetText) {
            this.setActiveByText(targetText);
        }
    }

    /**
     * Activa un enlace específico por su texto
     * @param {string} linkText - Texto del enlace a activar
     */
    setActiveByText(linkText) {
        this.navLinks.forEach(link => {
            // Remover active de todos los enlaces
            link.classList.remove('active');

            // Agregar active al enlace que coincida con el texto
            if (link.textContent.trim() === linkText) {
                link.classList.add('active');
                // Agregar atributo de accesibilidad
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Agrega listeners para efectos visuales inmediatos (opcional)
     */
    addClickListeners() {
        // Listeners para nav-links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Desactivar navbar-brand cuando se clica un nav-link
                this.setNavbarBrandActive(false);
                // Efecto visual inmediato antes de navegar
                this.setActiveByText(link.textContent.trim());
            });
        });

        // Listener para navbar-brand
        this.navbarBrand.addEventListener('click', (e) => {
            // Si el enlace apunta a projects-section, activarlo inmediatamente
            const href = this.navbarBrand.getAttribute('href');
            if (href && href.includes('#projects-section')) {
                this.setNavbarBrandActive(true);
                // Desactivar nav-links
                this.navLinks.forEach(link => {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                });
            }
        });
    }

    /**
     * Método público para cambiar manualmente el estado activo
     * @param {string} linkText - Texto del enlace a activar
     */
    setActive(linkText) {
        this.setActiveByText(linkText);
    }
}

// Inicializar el gestor cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia global para poder acceder desde otros scripts si es necesario
    window.navbarManager = new NavbarManager();
});

// También inicializar si el script se carga después del DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.navbarManager = new NavbarManager();
    });
} else {
    window.navbarManager = new NavbarManager();
}