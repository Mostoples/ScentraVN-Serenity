/**
 * SYNAWATCH - Chart.js Configurations
 */

const ChartConfigs = {
    // Default chart options
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(30, 27, 75, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(30, 27, 75, 0.5)',
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: 'rgba(30, 27, 75, 0.5)',
                    font: {
                        size: 11
                    }
                }
            }
        }
    },

    // Gradient colors
    gradients: {
        purple: (ctx, chartArea) => {
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(124, 58, 237, 0)');
            gradient.addColorStop(1, 'rgba(124, 58, 237, 0.3)');
            return gradient;
        },
        pink: (ctx, chartArea) => {
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(236, 72, 153, 0)');
            gradient.addColorStop(1, 'rgba(236, 72, 153, 0.3)');
            return gradient;
        },
        green: (ctx, chartArea) => {
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
            return gradient;
        },
        orange: (ctx, chartArea) => {
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(245, 158, 11, 0)');
            gradient.addColorStop(1, 'rgba(245, 158, 11, 0.3)');
            return gradient;
        }
    },

    /**
     * Create Heart Rate Chart
     */
    createHeartRateChart(ctx, data = { labels: [], values: [] }) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Heart Rate',
                    data: data.values,
                    borderColor: '#ef4444',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 40,
                        max: 140
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `${context.parsed.y} BPM`
                        }
                    }
                }
            }
        });
    },

    /**
     * Create Stress Level Chart
     */
    createStressChart(ctx, data = { labels: [], values: [] }) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Stress Level',
                    data: data.values,
                    backgroundColor: data.values.map(v => {
                        if (v <= 30) return 'rgba(16, 185, 129, 0.8)';
                        if (v <= 60) return 'rgba(245, 158, 11, 0.8)';
                        return 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 100
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `Stress: ${context.parsed.y}%`
                        }
                    }
                }
            }
        });
    },

    /**
     * Create GSR Chart
     */
    createGSRChart(ctx, data = { labels: [], values: [] }) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'GSR Level',
                    data: data.values,
                    borderColor: '#f59e0b',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(245, 158, 11, 0)');
                        gradient.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 100
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `GSR: ${context.parsed.y}%`
                        }
                    }
                }
            }
        });
    },

    /**
     * Create HRV Chart
     */
    createHRVChart(ctx, data = { labels: [], values: [] }) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'HRV',
                    data: data.values,
                    borderColor: '#7c3aed',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(124, 58, 237, 0)');
                        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.2)');
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `HRV: ${context.parsed.y} ms`
                        }
                    }
                }
            }
        });
    },

    /**
     * Create SpO2 Chart
     */
    createSpO2Chart(ctx, data = { labels: [], values: [] }) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'SpO2',
                    data: data.values,
                    borderColor: '#3b82f6',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
                        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 85,
                        max: 100
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `SpO2: ${context.parsed.y}%`
                        }
                    }
                }
            }
        });
    },

    /**
     * Create Health Score Chart (Doughnut)
     */
    createHealthScoreChart(ctx, score = 0) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [score, 100 - score],
                    backgroundColor: [
                        score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444',
                        'rgba(0, 0, 0, 0.05)'
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    },

    /**
     * Create Real-time Line Chart
     */
    createRealtimeChart(ctx, label, color, unit = '') {
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                ...this.defaultOptions,
                animation: false,
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `${context.parsed.y}${unit}`
                        }
                    }
                }
            }
        });

        // Add method to push data
        chart.pushData = function(value, maxPoints = 60) {
            const now = new Date();
            const label = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            this.data.labels.push(label);
            this.data.datasets[0].data.push(value);

            // Keep only last N points
            if (this.data.labels.length > maxPoints) {
                this.data.labels.shift();
                this.data.datasets[0].data.shift();
            }

            this.update('none');
        };

        return chart;
    },

    /**
     * Create Weekly Trend Chart
     */
    createWeeklyTrendChart(ctx, data) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Health Score',
                    data: data || [82, 78, 85, 79, 88, 84, 86],
                    borderColor: '#7c3aed',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(124, 58, 237, 0)');
                        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.2)');
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#7c3aed',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    },

    /**
     * Update chart with new data
     */
    updateChart(chart, labels, data) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    },

    /**
     * Destroy chart safely
     */
    destroyChart(chart) {
        if (chart) {
            chart.destroy();
        }
    }
};

// Make ChartConfigs globally available
window.ChartConfigs = ChartConfigs;
