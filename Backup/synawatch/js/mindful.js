/**
 * SYNAWATCH - Mindful Moment
 * 4-7-8 Breathing Exercise 
 */

const Mindful = {
    timer: null,
    phase: 0, // 0: Idle, 1: Inhale, 2: Hold, 3: Exhale
    
    init() {
        this.reset();
    },

    reset() {
        clearInterval(this.timer);
        this.phase = 0;
        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathingText');
        if(circle) circle.style.transform = 'scale(1)';
        if(text) text.textContent = "Mulai Latihan";
    },

    start() {
        if(this.phase !== 0) return;
        
        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathingText');
        
        let cycles = 0;

        const breatheIn = () => {
            this.phase = 1;
            text.textContent = "Tarik Napas (4s)";
            circle.style.transition = "transform 4s ease-out";
            circle.style.transform = 'scale(1.8)';
            setTimeout(holdIn, 4000);
        };

        const holdIn = () => {
            if(this.phase === 0) return;
            this.phase = 2;
            text.textContent = "Tahan (7s)";
            setTimeout(breatheOut, 7000);
        };

        const breatheOut = () => {
            if(this.phase === 0) return;
            this.phase = 3;
            text.textContent = "Hembuskan (8s)";
            circle.style.transition = "transform 8s ease-in";
            circle.style.transform = 'scale(1)';
            setTimeout(() => {
                cycles++;
                if (cycles < 4) breatheIn();
                else {
                    text.textContent = "Selesai. Kerja Bagus!";
                    this.phase = 0;
                }
            }, 8000);
        };

        breatheIn();
    }
};

window.Mindful = Mindful;
