class CurvedScrollbar {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            radius: options.radius || 25,
            color: options.color || '#720455',
            trackColor: options.trackColor || 'rgba(255, 255, 255, 0.1)',
            width: options.width || 6,
            ...options
        };
        
        this.init();
    }
    
    init() {
        // Hide default scrollbar
        this.element.style.scrollbarWidth = 'none';
        this.element.style.msOverflowStyle = 'none';
        
        this.createScrollbar();
        this.updateScrollbar();
        this.bindEvents();
    }
    
    createScrollbar() {
        this.container = document.createElement('div');
        this.container.className = 'curved-scrollbar';
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.className = 'curved-scrollbar-svg';
        
        // Create track
        this.track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.track.className = 'curved-scrollbar-track';
        
        // Create thumb
        this.thumb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.thumb.className = 'curved-scrollbar-thumb';
        
        this.svg.appendChild(this.track);
        this.svg.appendChild(this.thumb);
        this.container.appendChild(this.svg);
        
        // Position relative to parent
        this.element.parentNode.style.position = 'relative';
        this.element.parentNode.appendChild(this.container);
    }
    
    generatePath(startY, endY) {
        const width = this.options.width;
        const radius = this.options.radius;
        const height = endY - startY;
        
        if (height <= radius * 2) {
            // For very short thumbs, use a simple rounded rect
            return `M ${width/2} ${startY + height/2} 
                    a ${width/2} ${height/2} 0 0 1 0 0
                    a ${width/2} ${height/2} 0 0 1 0 0 Z`;
        }
        
        // Create curved path
        const controlPoint = Math.min(radius, height / 4);
        
        return `M ${width} ${startY + controlPoint}
                Q ${width} ${startY} ${width - controlPoint} ${startY}
                Q 0 ${startY} 0 ${startY + controlPoint}
                L 0 ${endY - controlPoint}
                Q 0 ${endY} ${controlPoint} ${endY}
                Q ${width} ${endY} ${width} ${endY - controlPoint}
                L ${width} ${startY + controlPoint} Z`;
    }
    
    updateScrollbar() {
        const { scrollTop, scrollHeight, clientHeight } = this.element;
        
        if (scrollHeight <= clientHeight) {
            this.container.style.display = 'none';
            return;
        }
        
        this.container.style.display = 'block';
        
        const containerHeight = clientHeight - 20; // padding
        const svgHeight = containerHeight;
        const svgWidth = this.options.width;
        
        this.svg.setAttribute('width', svgWidth);
        this.svg.setAttribute('height', svgHeight);
        this.svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        
        // Track path (full height)
        const trackPath = this.generatePath(0, svgHeight);
        this.track.setAttribute('d', trackPath);
        this.track.setAttribute('fill', this.options.trackColor);
        
        // Thumb calculations
        const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * containerHeight);
        const scrollableDistance = scrollHeight - clientHeight;
        const thumbTop = scrollableDistance > 0 ? (scrollTop / scrollableDistance) * (containerHeight - thumbHeight) : 0;
        
        // Thumb path
        const thumbPath = this.generatePath(thumbTop, thumbTop + thumbHeight);
        this.thumb.setAttribute('d', thumbPath);
        this.thumb.setAttribute('fill', this.options.color);
        
        // Position container
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.right = '4px';
        this.container.style.height = svgHeight + 'px';
        this.container.style.width = svgWidth + 'px';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '100';
    }
    
    bindEvents() {
        this.element.addEventListener('scroll', () => this.updateScrollbar());
        window.addEventListener('resize', () => this.updateScrollbar());
    }
}

// Initialize for FAQ cards
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const faqCards = document.querySelectorAll('.faq-card .second-content');
        faqCards.forEach(card => {
            new CurvedScrollbar(card, {
                radius: 15,
                color: '#720455',
                trackColor: 'rgba(255, 255, 255, 0.1)',
                width: 4
            });
        });
    }, 100);
});