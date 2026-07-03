import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutSegment {
    name: string;
    value: number;
    color: string;
}

interface BreakdownDonutProps {
    segments: DonutSegment[];
    centerLabel: string;
    centerValue: string;
    height?: number;
    formatValue?: (value: number) => string;
}

/**
 * Animated donut chart showing how a total splits into parts
 * (e.g. principal vs interest), with a headline figure in the center
 * and a percentage legend below.
 */
export function BreakdownDonut({
    segments,
    centerLabel,
    centerValue,
    height = 210,
    formatValue,
}: BreakdownDonutProps) {
    const data = segments.filter((s) => isFinite(s.value) && s.value > 0);
    const total = data.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <div style={{ position: 'relative', width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="68%"
                            outerRadius="92%"
                            paddingAngle={3}
                            cornerRadius={6}
                            strokeWidth={0}
                            animationDuration={800}
                        >
                            {data.map((s) => (
                                <Cell key={s.name} fill={s.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number | undefined) =>
                                formatValue ? formatValue(value || 0) : value
                            }
                            contentStyle={{
                                backgroundColor: 'var(--color-bg-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text-primary)',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        textAlign: 'center',
                    }}
                >
                    <span
                        style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {centerLabel}
                    </span>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {centerValue}
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {data.map((s) => (
                    <span
                        key={s.name}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.8125rem',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: s.color,
                                display: 'inline-block',
                            }}
                        />
                        {s.name}{' '}
                        <strong style={{ color: 'var(--color-text-primary)' }}>
                            {((s.value / total) * 100).toFixed(0)}%
                        </strong>
                    </span>
                ))}
            </div>
        </div>
    );
}
