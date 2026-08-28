// components/views/BusinessIntelligenceView.tsx - Production Ready
import React, { useState, useMemo } from 'react';
import { Sale, Product, StockMovement, AuditLog, Pharmacy } from '../../types';
import { generateBIReportPdf } from '../../utils/biReportGenerator';
import {
    TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
    Package, DollarSign, Clock,
    Zap, Award, BarChart3,
    Download, RefreshCw,
    Target, Sparkles, Lightbulb,
    Star, Trophy,
    AlertTriangle, Info, Maximize2, Minimize2,
    Activity, Copy, Check
} from 'lucide-react';

// Chart.js imports
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    RadialLinearScale
} from 'chart.js';
import { Line, Bar, Doughnut, PolarArea } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    RadialLinearScale
);

interface BusinessIntelligenceViewProps {
    pharmacy: Pharmacy | null;
    sales: Sale[];
    products: Product[];
    movements: StockMovement[];
    auditLogs: AuditLog[];
    theme?: 'dark' | 'light';
    isLoading?: boolean;
    onRefresh?: () => Promise<void>;
}

export const BusinessIntelligenceView: React.FC<BusinessIntelligenceViewProps> = ({
    pharmacy,
    sales,
    products,
    movements,
    auditLogs,
    theme = 'dark',
    isLoading = false,
    onRefresh,
}) => {
    const isDark = theme === 'dark';
    const currency = pharmacy?.currency || 'KSh';

    // Styles - Edge to edge on mobile
    const cardBg = isDark ? 'bg-[#161b22] text-[#c9d1d9]' : 'bg-white text-[#1f2328] shadow-sm';
    const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#656d76]';
    const textTitle = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
    const borderLine = isDark ? 'border-[#30363d]' : 'border-[#d0d7de]';
    const chartTextColor = isDark ? '#c9d1d9' : '#1f2328';
    const chartGridColor = isDark ? '#30363d' : '#d0d7de';

    const touchTargetSmall = 'min-h-[36px] min-w-[36px]';

    // State
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [showInsights, setShowInsights] = useState<boolean>(true);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [chartView, setChartView] = useState<'revenue' | 'items' | 'both'>('both');
    const [copied, setCopied] = useState<boolean>(false);

    // Date range
    const dateRange = useMemo(() => {
        const now = new Date();
        const start = {
            '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            'all': new Date(0)
        }[timeRange];
        return { start, end: new Date() };
    }, [timeRange]);

    // Filtered sales
    const filteredSales = useMemo(() => {
        const { start, end } = dateRange;
        return sales.filter(sale => {
            const saleDate = new Date(sale.sale_date || sale.created_at);
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, dateRange]);

    // --- METRICS ---
    const metrics = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalItems = filteredSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
        const totalTransactions = filteredSales.length;
        const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        const totalSubtotal = filteredSales.reduce((sum, s) => sum + (s.subtotal || 0), 0);
        const totalDiscounts = filteredSales.reduce((sum, s) => sum + (s.discount || 0), 0);
        const profitMargin = totalRevenue > 0
            ? ((totalRevenue - (totalSubtotal - totalDiscounts)) / totalRevenue) * 100
            : 0;

        const paymentStats: Record<string, { count: number; revenue: number }> = {};
        filteredSales.forEach(s => {
            const method = s.payment_method || 'cash';
            if (!paymentStats[method]) paymentStats[method] = { count: 0, revenue: 0 };
            paymentStats[method].count += 1;
            paymentStats[method].revenue += s.total || 0;
        });

        const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
        filteredSales.forEach(s => {
            const key = s.product_id || s.product_name || 'Unknown';
            if (!productStats[key]) {
                productStats[key] = {
                    name: s.product_name || 'Unknown',
                    quantity: 0,
                    revenue: 0
                };
            }
            productStats[key].quantity += s.quantity || 0;
            productStats[key].revenue += s.subtotal || 0;
        });

        const hourlyStats: Record<number, { revenue: number; count: number }> = {};
        filteredSales.forEach(s => {
            const hour = new Date(s.sale_date || s.created_at).getHours();
            if (!hourlyStats[hour]) hourlyStats[hour] = { revenue: 0, count: 0 };
            hourlyStats[hour].revenue += s.total || 0;
            hourlyStats[hour].count += 1;
        });

        const dailyStats: Record<string, { revenue: number; count: number; items: number }> = {};
        filteredSales.forEach(s => {
            const date = new Date(s.sale_date || s.created_at).toISOString().split('T')[0];
            if (!dailyStats[date]) dailyStats[date] = { revenue: 0, count: 0, items: 0 };
            dailyStats[date].revenue += s.total || 0;
            dailyStats[date].count += 1;
            dailyStats[date].items += s.quantity || 0;
        });

        return {
            totalRevenue,
            totalItems,
            totalTransactions,
            avgTransaction,
            profitMargin,
            paymentStats,
            productStats,
            hourlyStats,
            dailyStats,
            totalDiscounts,
            totalSubtotal
        };
    }, [filteredSales]);

    // --- CHART DATA ---
    const revenueTrendData = useMemo(() => {
        const dates = Object.keys(metrics.dailyStats).sort();
        const revenues = dates.map(d => metrics.dailyStats[d].revenue);
        const items = dates.map(d => metrics.dailyStats[d].items);

        return {
            labels: dates.map(d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    borderColor: '#2ea043',
                    backgroundColor: 'rgba(46, 160, 67, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    yAxisID: 'y',
                },
                {
                    label: 'Items Sold',
                    data: items,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    borderDash: [5, 5],
                    yAxisID: 'y1',
                }
            ]
        };
    }, [metrics.dailyStats]);

    const productChartData = useMemo(() => {
        const topProducts = Object.values(metrics.productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);

        return {
            labels: topProducts.map(p => p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name),
            datasets: [
                {
                    label: 'Revenue',
                    data: topProducts.map(p => p.revenue),
                    backgroundColor: 'rgba(46, 160, 67, 0.7)',
                    borderColor: '#2ea043',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Quantity Sold',
                    data: topProducts.map(p => p.quantity),
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        };
    }, [metrics.productStats]);

    const paymentChartData = useMemo(() => {
        const methods = Object.keys(metrics.paymentStats);
        const colors = {
            cash: '#10b981',
            mpesa: '#059669',
            card: '#3b82f6',
            credit: '#8b5cf6',
            insurance: '#06b6d4',
            other: '#6b7280'
        };

        return {
            labels: methods.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
            datasets: [{
                data: methods.map(m => metrics.paymentStats[m].revenue),
                backgroundColor: methods.map(m => colors[m as keyof typeof colors] || '#6b7280'),
                borderColor: isDark ? '#161b22' : '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [metrics.paymentStats, isDark]);

    const hourlyChartData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const revenues = hours.map(h => metrics.hourlyStats[h]?.revenue || 0);
        const counts = hours.map(h => metrics.hourlyStats[h]?.count || 0);

        return {
            labels: hours.map(h => {
                if (h === 0) return '12am';
                if (h < 12) return `${h}am`;
                if (h === 12) return '12pm';
                return `${h - 12}pm`;
            }),
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    backgroundColor: 'rgba(46, 160, 67, 0.6)',
                    borderColor: '#2ea043',
                    borderWidth: 1,
                    borderRadius: 2,
                },
                {
                    label: 'Transactions',
                    data: counts,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 2,
                }
            ]
        };
    }, [metrics.hourlyStats]);

    const polarChartData = useMemo(() => {
        const topProducts = Object.values(metrics.productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6);

        const colors = ['#2ea043', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

        return {
            labels: topProducts.map(p => p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name),
            datasets: [{
                data: topProducts.map(p => p.revenue),
                backgroundColor: colors.slice(0, topProducts.length),
                borderColor: isDark ? '#161b22' : '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [metrics.productStats, isDark]);

    // --- INSIGHTS ---
    const insights = useMemo(() => {
        const list: Array<{
            type: 'positive' | 'warning' | 'critical' | 'info';
            icon: React.ReactNode;
            title: string;
            description: string;
        }> = [];

        const { totalRevenue, totalTransactions, avgTransaction, profitMargin, productStats, hourlyStats } = metrics;

        if (totalRevenue > 100000) {
            list.push({
                type: 'positive',
                icon: <Trophy className="w-5 h-5" />,
                title: 'Excellent Revenue',
                description: `${currency} ${totalRevenue.toLocaleString()} in revenue. Outstanding performance.`
            });
        } else if (totalRevenue > 50000) {
            list.push({
                type: 'positive',
                icon: <Star className="w-5 h-5" />,
                title: 'Good Revenue',
                description: `${currency} ${totalRevenue.toLocaleString()} in revenue. Keep it up.`
            });
        } else if (totalRevenue < 10000 && totalTransactions > 0) {
            list.push({
                type: 'warning',
                icon: <AlertCircle className="w-5 h-5" />,
                title: 'Revenue Below Target',
                description: `${currency} ${totalRevenue.toLocaleString()} - consider running promotions.`
            });
        }

        const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
        if (topProducts.length > 0) {
            const top = topProducts[0];
            const concentration = (top.revenue / totalRevenue) * 100;
            if (concentration > 40) {
                list.push({
                    type: 'warning',
                    icon: <Package className="w-5 h-5" />,
                    title: 'High Product Concentration',
                    description: `"${top.name}" accounts for ${concentration.toFixed(1)}% of revenue. Diversify your inventory.`
                });
            } else if (concentration < 15 && topProducts.length > 5) {
                list.push({
                    type: 'positive',
                    icon: <CheckCircle2 className="w-5 h-5" />,
                    title: 'Balanced Portfolio',
                    description: 'Revenue is well-distributed across products. Healthy business model.'
                });
            }
        }

        const peakHours = Object.entries(hourlyStats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 1);

        if (peakHours.length > 0) {
            const [hour, data] = peakHours[0];
            const hourNum = parseInt(hour);
            const hourStr = hourNum >= 12
                ? `${hourNum === 0 ? 12 : hourNum - 12}:00 ${hourNum >= 12 ? 'PM' : 'AM'}`
                : `${hourNum}:00 AM`;
            list.push({
                type: 'info',
                icon: <Clock className="w-5 h-5" />,
                title: 'Peak Business Hour',
                description: `${hourStr} - ${data.count} transactions, ${currency} ${data.revenue.toFixed(2)}`
            });
        }

        if (totalTransactions > 100) {
            list.push({
                type: 'positive',
                icon: <Activity className="w-5 h-5" />,
                title: 'High Transaction Volume',
                description: `${totalTransactions} transactions - strong operational activity.`
            });
        } else if (totalTransactions < 20 && totalTransactions > 0) {
            list.push({
                type: 'info',
                icon: <Zap className="w-5 h-5" />,
                title: 'Low Transaction Volume',
                description: `${totalTransactions} transactions - consider marketing initiatives.`
            });
        }

        if (avgTransaction > 1000) {
            list.push({
                type: 'positive',
                icon: <Award className="w-5 h-5" />,
                title: 'High Average Transaction',
                description: `${currency} ${avgTransaction.toFixed(2)} average - excellent value.`
            });
        } else if (avgTransaction < 300 && totalTransactions > 0) {
            list.push({
                type: 'info',
                icon: <Target className="w-5 h-5" />,
                title: 'Low Average Transaction',
                description: `${currency} ${avgTransaction.toFixed(2)} - consider upselling strategies.`
            });
        }

        if (profitMargin > 30) {
            list.push({
                type: 'positive',
                icon: <DollarSign className="w-5 h-5" />,
                title: 'Excellent Profit Margin',
                description: `${profitMargin.toFixed(1)}% - above industry average.`
            });
        } else if (profitMargin < 10 && totalTransactions > 0) {
            list.push({
                type: 'warning',
                icon: <AlertTriangle className="w-5 h-5" />,
                title: 'Low Profit Margin',
                description: `${profitMargin.toFixed(1)}% - review pricing and costs.`
            });
        }

        const productCount = Object.keys(productStats).length;
        if (productCount > 20) {
            list.push({
                type: 'positive',
                icon: <Package className="w-5 h-5" />,
                title: 'Wide Product Variety',
                description: `${productCount} different products sold - great inventory diversity.`
            });
        }

        return list.slice(0, 8);
    }, [metrics, currency]);

    // --- COPY TO CLIPBOARD ---
    const handleCopySummary = async () => {
        const summary = generateDetailedSummary();
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = summary;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    };

    // --- GENERATE DETAILED SUMMARY ---
    const generateDetailedSummary = () => {
        const { totalRevenue, totalItems, totalTransactions, avgTransaction, profitMargin, productStats, paymentStats, hourlyStats, totalDiscounts } = metrics;
        const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
        const totalProducts = Object.keys(productStats).length;
        const totalPaymentMethods = Object.keys(paymentStats).length;
        const totalPaymentRevenue = Object.values(paymentStats).reduce((sum, d) => sum + d.revenue, 0);

        const formatCurrency = (amount: number) => `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatNumber = (num: number) => num.toLocaleString();
        const formatPercentage = (num: number) => num.toFixed(1);

        const sections = [];

        // Header
        sections.push('='.repeat(70));
        sections.push('BUSINESS INTELLIGENCE EXECUTIVE SUMMARY');
        sections.push('='.repeat(70));
        sections.push(`Pharmacy:           ${pharmacy?.name || 'Pharmacy'}`);
        sections.push(`Analysis Period:    ${timeRange === 'all' ? 'All Time' : `Last ${timeRange.replace('d', ' Days')}`}`);
        sections.push(`Report Generated:   ${new Date().toLocaleString()}`);
        sections.push(`Transactions Analyzed: ${formatNumber(filteredSales.length)}`);
        sections.push('='.repeat(70));
        sections.push('');

        // Section 1: Key Performance Metrics
        sections.push('KEY PERFORMANCE METRICS');
        sections.push('-'.repeat(70));
        sections.push(`Total Revenue:            ${formatCurrency(totalRevenue)}`);
        sections.push(`Total Items Sold:         ${formatNumber(totalItems)} units`);
        sections.push(`Total Transactions:       ${formatNumber(totalTransactions)}`);
        sections.push(`Average Transaction:      ${formatCurrency(avgTransaction)}`);
        sections.push(`Average Items Per Sale:   ${totalTransactions > 0 ? (totalItems / totalTransactions).toFixed(1) : '0'} items`);
        sections.push(`Profit Margin:            ${formatPercentage(profitMargin)}%`);
        sections.push(`Total Discounts Given:    ${formatCurrency(totalDiscounts)}`);
        sections.push(`Discount Rate:            ${totalRevenue > 0 ? ((totalDiscounts / totalRevenue) * 100).toFixed(1) : '0'}%`);
        sections.push('');

        // Section 2: Product Performance
        sections.push('PRODUCT PERFORMANCE ANALYSIS');
        sections.push('-'.repeat(70));
        sections.push(`Unique Products Sold:     ${formatNumber(totalProducts)}`);
        sections.push(`Product Diversity Score:  ${totalProducts > 0 ? (Math.min(totalProducts / 10 * 100, 100)).toFixed(0) : 0}%`);
        sections.push('');

        if (topProducts.length > 0) {
            sections.push('Top 5 Best Selling Products:');
            sections.push('');
            topProducts.slice(0, 5).forEach((p, index) => {
                const revenueShare = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                const rank = ['1st', '2nd', '3rd', '4th', '5th'][index] || '•';
                sections.push(`  ${rank}: ${p.name}`);
                sections.push(`      Revenue:      ${formatCurrency(p.revenue)} (${formatPercentage(revenueShare)}% of total)`);
                sections.push(`      Units Sold:   ${formatNumber(p.quantity)}`);
                sections.push(`      Avg Price:    ${formatCurrency(p.revenue / p.quantity)}`);
                sections.push('');
            });
        }

        // Section 3: Payment Method Analysis
        sections.push('PAYMENT METHOD BREAKDOWN');
        sections.push('-'.repeat(70));
        sections.push(`Payment Methods Used:     ${totalPaymentMethods}`);
        sections.push('');
        Object.entries(paymentStats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .forEach(([method, data]) => {
                const percentage = totalPaymentRevenue > 0 ? (data.revenue / totalPaymentRevenue) * 100 : 0;
                const methodLabel = method.charAt(0).toUpperCase() + method.slice(1);
                sections.push(`  ${methodLabel}:`);
                sections.push(`      Revenue:      ${formatCurrency(data.revenue)} (${formatPercentage(percentage)}%)`);
                sections.push(`      Transactions: ${formatNumber(data.count)}`);
                sections.push(`      Avg Value:    ${formatCurrency(data.revenue / data.count)}`);
                sections.push('');
            });

        // Section 4: Hourly & Time Analysis
        sections.push('OPERATIONAL TIME ANALYSIS');
        sections.push('-'.repeat(70));
        const peakHours = Object.entries(hourlyStats)
            .sort((a, b) => b[1].revenue - a[1].revenue);

        if (peakHours.length > 0) {
            const [peakHour, peakData] = peakHours[0];
            const hourNum = parseInt(peakHour);
            const peakHourStr = hourNum >= 12
                ? `${hourNum === 0 ? 12 : hourNum - 12}:00 ${hourNum >= 12 ? 'PM' : 'AM'}`
                : `${hourNum}:00 AM`;
            sections.push(`Peak Business Hour:      ${peakHourStr}`);
            sections.push(`  Transactions:           ${formatNumber(peakData.count)}`);
            sections.push(`  Revenue:                ${formatCurrency(peakData.revenue)}`);
            sections.push('');
        }

        // Section 5: Business Insights
        if (insights.length > 0) {
            sections.push('BUSINESS INSIGHTS & RECOMMENDATIONS');
            sections.push('-'.repeat(70));
            insights.forEach((i) => {
                const typeLabel = i.type === 'positive' ? '[Positive]' :
                    i.type === 'warning' ? '[Warning]' :
                        i.type === 'critical' ? '[Critical]' : '[Info]';
                sections.push(`${typeLabel} ${i.title}`);
                sections.push(`   ${i.description}`);
                sections.push('');
            });
        }

        // Section 6: Recommendations
        sections.push('STRATEGIC RECOMMENDATIONS');
        sections.push('-'.repeat(70));

        // Generate recommendations based on data
        if (totalRevenue < 50000 && totalTransactions > 0) {
            sections.push('  - Consider running promotional campaigns to boost revenue');
        }
        if (avgTransaction < 300) {
            sections.push('  - Implement upselling and cross-selling strategies');
        }
        if (profitMargin < 15) {
            sections.push('  - Review supplier pricing and negotiate better rates');
        }
        if (Object.keys(productStats).length < 10) {
            sections.push('  - Expand product portfolio to attract more customers');
        }
        if (Object.keys(paymentStats).length < 2) {
            sections.push('  - Add more payment options to improve customer convenience');
        }
        if (Object.keys(hourlyStats).length > 0) {
            const peakHour = Object.entries(hourlyStats).sort((a, b) => b[1].revenue - a[1].revenue)[0];
            const lowHour = Object.entries(hourlyStats).sort((a, b) => a[1].revenue - b[1].revenue)[0];
            if (lowHour && peakHour && lowHour[1].revenue < peakHour[1].revenue * 0.3) {
                sections.push('  - Consider special offers during slow hours to increase traffic');
            }
        }
        if (sections[sections.length - 1] === 'STRATEGIC RECOMMENDATIONS') {
            sections.push('  - Continue monitoring performance and maintain current strategies');
        }

        sections.push('');
        sections.push('='.repeat(70));
        sections.push(`Report generated from ${formatNumber(filteredSales.length)} transactions`);
        sections.push(`Data freshness: ${new Date().toLocaleString()}`);
        sections.push('='.repeat(70));

        return sections.join('\n');
    };

    // --- EXPORT ---
    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const periodMap = {
                '7d': 'Last 7 Days',
                '30d': 'Last 30 Days',
                '90d': 'Last 90 Days',
                'all': 'All Time'
            };

            const topProducts = Object.values(metrics.productStats)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10)
                .map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }));

            const paymentMethods = Object.entries(metrics.paymentStats).map(([method, data]) => {
                const totalRevenue = Object.values(metrics.paymentStats).reduce((sum, d) => sum + d.revenue, 0);
                return {
                    method,
                    count: data.count,
                    revenue: data.revenue,
                    percentage: (data.revenue / totalRevenue) * 100
                };
            });

            const peakHours = Object.entries(metrics.hourlyStats)
                .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
                .sort((a, b) => b.revenue - a.revenue);

            // In handleExportPDF function, add this:
            const reportData = {
                pharmacyName: pharmacy?.name || 'Pharmacy',
                currency: currency,
                period: periodMap[timeRange],
                generatedAt: new Date().toISOString(),
                metrics: {
                    totalRevenue: metrics.totalRevenue,
                    totalItems: metrics.totalItems,
                    totalTransactions: metrics.totalTransactions,
                    uniqueCustomers: 0,
                    avgTransaction: metrics.avgTransaction,
                    profitMargin: metrics.profitMargin
                },
                topProducts,
                paymentMethods,
                peakHours,
                insights: insights.map(i => ({
                    title: i.title,
                    description: i.description,
                    type: i.type
                })),
                detailedSummary: generateDetailedSummary() // Add this line
            };

            generateBIReportPdf(reportData);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Chart options
    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: {
                labels: { color: chartTextColor, font: { size: 11 } }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.dataset.label === 'Revenue') {
                            label += `${currency} ${context.parsed.y.toFixed(2)}`;
                        } else if (context.dataset.label === 'Items Sold') {
                            label += `${context.parsed.y} units`;
                        } else {
                            label += context.parsed.y;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: chartGridColor },
                ticks: {
                    color: chartTextColor,
                    callback: function (value: any) { return `${currency} ${value}`; }
                }
            },
            y1: {
                position: 'right' as const,
                beginAtZero: true,
                grid: { display: false },
                ticks: { color: chartTextColor }
            },
            x: {
                grid: { color: chartGridColor },
                ticks: { color: chartTextColor, maxTicksLimit: 15 }
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: chartTextColor, font: { size: 11 } }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: chartGridColor },
                ticks: { color: chartTextColor }
            },
            x: {
                grid: { display: false },
                ticks: { color: chartTextColor, maxTicksLimit: 10 }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: chartTextColor, font: { size: 10 }, padding: 10 }
            }
        }
    };

    const polarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: chartTextColor, font: { size: 10 }, padding: 10 }
            }
        },
        scales: {
            r: {
                grid: { color: chartGridColor },
                ticks: { color: chartTextColor, backdropColor: 'transparent' }
            }
        }
    };

    // Skeleton
    const SkeletonCard = () => (
        <div className={`p-4 rounded-2xl animate-pulse ${cardBg}`}>
            <div className={`h-4 ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'} rounded w-24 mb-2`}></div>
            <div className={`h-7 ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'} rounded w-32`}></div>
        </div>
    );

    const SkeletonChart = () => (
        <div className={`p-4 rounded-2xl animate-pulse ${cardBg}`}>
            <div className={`h-4 ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'} rounded w-32 mb-4`}></div>
            <div className={`h-48 ${isDark ? 'bg-[#21262d]' : 'bg-[#e8eaed]'} rounded`}></div>
        </div>
    );

    return (
        <div className="space-y-3 px-0 pb-20 md:pb-6">

            {/* Header - Edge to Edge on Mobile */}
            <div className={`p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg} ${isDark ? 'border-b border-[#30363d]' : 'border-b border-[#d0d7de]'}`}>
                <div>
                    <h2 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
                        <BarChart3 className="w-5 h-5 text-[#2ea043]" />
                        <span>Business Intelligence</span>
                        <span className={`text-xs font-normal ${textMuted} ml-2`}>
                            {pharmacy?.name || 'Pharmacy'}
                        </span>
                    </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex p-1 rounded-xl text-sm font-bold gap-1 ${isDark ? 'bg-[#21262d]' : 'bg-[#f6f8fa]'}`}>
                        {(['7d', '30d', '90d', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 rounded-lg transition-colors ${touchTargetSmall} ${timeRange === range
                                    ? 'bg-[#2ea043] text-white font-bold shadow'
                                    : textMuted
                                    }`}
                            >
                                {range === 'all' ? 'All' : range.replace('d', 'D')}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting || filteredSales.length === 0}
                        className={`px-4 py-2.5 bg-[#2ea043] hover:bg-[#3fb950] text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-colors ${touchTargetSmall
                            } ${(isExporting || filteredSales.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Download className="w-4 h-4" />
                        <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
                    </button>
                </div>
            </div>

            {/* Metrics - Edge to Edge */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2">
                {isLoading ? (
                    <>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </>
                ) : (
                    <>
                        <div className={`p-3 rounded-2xl ${cardBg}`}>
                            <p className={`text-xs font-semibold ${textMuted}`}>Revenue</p>
                            <p className="text-lg font-extrabold text-[#2ea043] mt-1">
                                {currency} {metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className={`text-[9px] ${textMuted} mt-0.5`}>
                                {metrics.totalTransactions} transactions
                            </p>
                        </div>
                        <div className={`p-3 rounded-2xl ${cardBg}`}>
                            <p className={`text-xs font-semibold ${textMuted}`}>Items Sold</p>
                            <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                                {metrics.totalItems.toLocaleString()}
                            </p>
                            <p className={`text-[9px] ${textMuted} mt-0.5`}>
                                {Object.keys(metrics.productStats).length} products
                            </p>
                        </div>
                        <div className={`p-3 rounded-2xl ${cardBg}`}>
                            <p className={`text-xs font-semibold ${textMuted}`}>Avg. Transaction</p>
                            <p className={`text-lg font-extrabold mt-1 ${textTitle}`}>
                                {currency} {metrics.avgTransaction.toFixed(2)}
                            </p>
                            <p className={`text-[9px] ${textMuted} mt-0.5`}>
                                {metrics.totalTransactions > 0 ? `${(metrics.totalItems / metrics.totalTransactions).toFixed(1)} items/transaction` : 'No transactions'}
                            </p>
                        </div>
                        <div className={`p-3 rounded-2xl ${cardBg}`}>
                            <p className={`text-xs font-semibold ${textMuted}`}>Profit Margin</p>
                            <p className={`text-lg font-extrabold mt-1 ${metrics.profitMargin > 20 ? 'text-[#2ea043]' : 'text-amber-500'}`}>
                                {metrics.profitMargin.toFixed(1)}%
                            </p>
                            <p className={`text-[9px] ${textMuted} mt-0.5`}>
                                {metrics.totalDiscounts > 0 ? `${currency} ${metrics.totalDiscounts.toFixed(2)} in discounts` : 'No discounts'}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Chart View Toggle */}
            <div className={`flex items-center gap-2 p-2 mx-2 rounded-xl ${cardBg}`}>
                <span className={`text-xs font-bold ${textMuted} mr-1`}>View:</span>
                <button
                    onClick={() => setChartView('both')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${touchTargetSmall} ${chartView === 'both' ? 'bg-[#2ea043] text-white' : textMuted
                        }`}
                >
                    Both
                </button>
                <button
                    onClick={() => setChartView('revenue')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${touchTargetSmall} ${chartView === 'revenue' ? 'bg-[#2ea043] text-white' : textMuted
                        }`}
                >
                    Revenue
                </button>
                <button
                    onClick={() => setChartView('items')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${touchTargetSmall} ${chartView === 'items' ? 'bg-[#2ea043] text-white' : textMuted
                        }`}
                >
                    Items
                </button>
            </div>

            {/* Main Revenue Trend Chart */}
            {isLoading ? (
                <SkeletonChart />
            ) : filteredSales.length > 0 ? (
                <div className={`p-4 mx-2 rounded-2xl ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-bold text-sm ${textTitle}`}>Revenue and Sales Trend</h3>
                        <span className={`text-xs ${textMuted}`}>
                            {Object.keys(metrics.dailyStats).length} days
                        </span>
                    </div>
                    <div className="h-56">
                        <Line
                            data={{
                                ...revenueTrendData,
                                datasets: chartView === 'revenue'
                                    ? revenueTrendData.datasets.filter(d => d.label === 'Revenue')
                                    : chartView === 'items'
                                        ? revenueTrendData.datasets.filter(d => d.label === 'Items Sold')
                                        : revenueTrendData.datasets
                            }}
                            options={lineOptions}
                        />
                    </div>
                </div>
            ) : (
                <div className={`p-8 mx-2 rounded-2xl text-center ${cardBg}`}>
                    <BarChart3 className="w-12 h-12 mx-auto opacity-30 mb-2" />
                    <p className={`text-sm ${textMuted}`}>No sales data available for this period</p>
                    <p className={`text-xs ${textMuted} mt-1`}>Start making sales to see charts and insights</p>
                </div>
            )}

            {/* Insights Toggle */}
            {filteredSales.length > 0 && (
                <button
                    onClick={() => setShowInsights(!showInsights)}
                    className={`w-full p-3 mx-0 rounded-2xl text-left flex items-center justify-between ${cardBg}`}
                >
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                        <span className={`font-bold ${textTitle}`}>
                            {showInsights ? 'Hide Smart Insights' : 'Show Smart Insights'}
                        </span>
                        <span className={`text-xs ${textMuted}`}>
                            ({insights.length} insights)
                        </span>
                    </div>
                    {showInsights ? <Minimize2 className="w-4 h-4 text-[#2ea043]" /> : <Maximize2 className="w-4 h-4 text-[#2ea043]" />}
                </button>
            )}

            {/* Insights Panel */}
            {showInsights && filteredSales.length > 0 && insights.length > 0 && (
                <div className={`p-4 mx-2 rounded-2xl ${cardBg}`}>
                    <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${textTitle}`}>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Key Insights</span>
                    </h3>
                    <div className="space-y-2">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-xl flex items-start gap-3 ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}
                            >
                                <div className={`flex-shrink-0 mt-0.5 ${insight.type === 'positive' ? 'text-[#2ea043]' :
                                    insight.type === 'warning' ? 'text-amber-500' :
                                        insight.type === 'critical' ? 'text-red-500' :
                                            'text-blue-500'
                                    }`}>
                                    {insight.icon}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-sm ${textTitle}`}>{insight.title}</p>
                                    <p className={`text-xs ${textMuted}`}>{insight.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-2">
                {/* Product Performance Chart */}
                {isLoading ? (
                    <SkeletonChart />
                ) : filteredSales.length > 0 ? (
                    <div className={`p-4 rounded-2xl ${cardBg}`}>
                        <h3 className={`font-bold text-sm mb-3 ${textTitle}`}>Top Products</h3>
                        <div className="h-56">
                            <Bar data={productChartData} options={barOptions} />
                        </div>
                    </div>
                ) : null}

                {/* Payment Methods Chart */}
                {isLoading ? (
                    <SkeletonChart />
                ) : filteredSales.length > 0 && Object.keys(metrics.paymentStats).length > 0 ? (
                    <div className={`p-4 rounded-2xl ${cardBg}`}>
                        <h3 className={`font-bold text-sm mb-3 ${textTitle}`}>Payment Methods</h3>
                        <div className="h-56 flex items-center justify-center">
                            <div className="w-56 h-56">
                                <Doughnut data={paymentChartData} options={doughnutOptions} />
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Hourly Distribution Chart */}
                {isLoading ? (
                    <SkeletonChart />
                ) : filteredSales.length > 0 ? (
                    <div className={`p-4 rounded-2xl ${cardBg}`}>
                        <h3 className={`font-bold text-sm mb-3 ${textTitle}`}>Hourly Activity</h3>
                        <div className="h-56">
                            <Bar data={hourlyChartData} options={barOptions} />
                        </div>
                    </div>
                ) : null}

                {/* Product Distribution - Polar Area */}
                {isLoading ? (
                    <SkeletonChart />
                ) : filteredSales.length > 0 && Object.keys(metrics.productStats).length > 1 ? (
                    <div className={`p-4 rounded-2xl ${cardBg}`}>
                        <h3 className={`font-bold text-sm mb-3 ${textTitle}`}>Product Distribution</h3>
                        <div className="h-56 flex items-center justify-center">
                            <div className="w-56 h-56">
                                <PolarArea data={polarChartData} options={polarOptions} />
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
            {/* TEXTUAL SUMMARY - Full details with copy to clipboard */}
            {filteredSales.length > 0 && (
                <div className={`p-4 mx-2 rounded-2xl ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-bold text-sm flex items-center gap-2 ${textTitle}`}>
                            <Info className="w-4 h-4 text-[#2ea043]" />
                            <span>Executive Summary</span>
                        </h3>
                        <button
                            onClick={handleCopySummary}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${touchTargetSmall} ${copied
                                ? 'bg-[#2ea043] text-white'
                                : isDark
                                    ? 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
                                    : 'bg-[#f6f8fa] hover:bg-[#e8eaed] text-[#1f2328]'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy to Clipboard</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} text-sm leading-relaxed overflow-x-auto`}>
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed max-w-full">
                            {generateDetailedSummary()}
                        </pre>
                    </div>
                </div>
            )}
            {/* Quick Stats Footer - Edge to Edge */}
            <div className={`p-4 mx-0 rounded-2xl ${cardBg} ${isDark ? 'border-t border-[#30363d]' : 'border-t border-[#d0d7de]'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                        <p className={`text-xs ${textMuted}`}>Total Sales</p>
                        <p className={`font-extrabold ${textTitle}`}>{filteredSales.length}</p>
                    </div>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Products Sold</p>
                        <p className={`font-extrabold ${textTitle}`}>{Object.keys(metrics.productStats).length}</p>
                    </div>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Period</p>
                        <p className={`font-extrabold ${textTitle}`}>
                            {timeRange === 'all' ? 'All Time' : timeRange.replace('d', ' Days')}
                        </p>
                    </div>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Updated</p>
                        <p className={`font-extrabold ${textTitle} text-[10px]`}>
                            {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                <div className={`mt-3 pt-3 border-t ${borderLine} text-center`}>
                    <p className={`text-[10px] ${textMuted}`}>
                        {filteredSales.length} transactions analyzed • {Object.keys(metrics.productStats).length} products • {Object.keys(metrics.paymentStats).length} payment methods
                    </p>
                </div>
            </div>

        </div>
    );
};