/**
 * SYNAWATCH - PWA Icon Generator
 * Generates PWA icons dynamically using Canvas
 */

const IconGenerator = {
    /**
     * Generate all required PWA icons
     */
    async generateAllIcons() {
        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

        for (const size of sizes) {
            await this.generateIcon(size, false);
            if (size >= 192) {
                await this.generateIcon(size, true);
            }
        }

        console.log('[IconGenerator] All icons generated');
    },

    /**
     * Generate a single icon
     */
    async generateIcon(size, maskable = false) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Background
        if (maskable) {
            // Maskable icons need safe zone (40% padding)
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#8B5CF6');
            gradient.addColorStop(1, '#7C3AED');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Draw heart icon in safe zone
            this.drawHeartIcon(ctx, size, 0.4);
        } else {
            // Regular icons with rounded corners
            const radius = size * 0.2;
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(size - radius, 0);
            ctx.quadraticCurveTo(size, 0, size, radius);
            ctx.lineTo(size, size - radius);
            ctx.quadraticCurveTo(size, size, size - radius, size);
            ctx.lineTo(radius, size);
            ctx.quadraticCurveTo(0, size, 0, size - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#8B5CF6');
            gradient.addColorStop(1, '#7C3AED');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw heart icon
            this.drawHeartIcon(ctx, size, 0.3);
        }

        // Convert to blob and save
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const filename = maskable
                    ? `icon-maskable-${size}x${size}.png`
                    : `icon-${size}x${size}.png`;

                // Store in memory for use
                this.icons = this.icons || {};
                this.icons[filename] = URL.createObjectURL(blob);

                resolve(this.icons[filename]);
            }, 'image/png');
        });
    },

    /**
     * Draw heart/pulse icon
     */
    drawHeartIcon(ctx, size, padding) {
        const iconSize = size * (1 - padding * 2);
        const offsetX = size * padding;
        const offsetY = size * padding;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        // Scale to icon size
        const scale = iconSize / 100;
        ctx.scale(scale, scale);

        // Draw heart with pulse
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Heart shape
        ctx.beginPath();
        ctx.moveTo(50, 85);
        ctx.bezierCurveTo(15, 55, 15, 25, 50, 25);
        ctx.bezierCurveTo(85, 25, 85, 55, 50, 85);
        ctx.fill();

        // Pulse line
        ctx.beginPath();
        ctx.moveTo(20, 50);
        ctx.lineTo(35, 50);
        ctx.lineTo(42, 35);
        ctx.lineTo(50, 65);
        ctx.lineTo(58, 40);
        ctx.lineTo(65, 50);
        ctx.lineTo(80, 50);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Get icon URL
     */
    getIconUrl(filename) {
        return this.icons && this.icons[filename] ? this.icons[filename] : `/images/icons/${filename}`;
    }
};

// Auto-generate icons on load (for development)
// In production, use pre-generated icons
if (typeof window !== 'undefined') {
    window.IconGenerator = IconGenerator;
}
