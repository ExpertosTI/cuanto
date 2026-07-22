import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

interface Slice {
  name: string
  value: number
  color: string
}

interface DonutChartProps {
  data: Slice[]
  centerLabel: string
  centerValue: string
}

export function DonutChart({ data, centerLabel, centerValue }: DonutChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0)

  return (
    <motion.div
      className="donut-wrap"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={hasData ? data : [{ name: 'empty', value: 1, color: '#DCE7E1' }]}
            dataKey="value"
            innerRadius={72}
            outerRadius={96}
            paddingAngle={hasData ? 3 : 0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            animationBegin={80}
            animationDuration={700}
          >
            {(hasData ? data : [{ name: 'empty', value: 1, color: '#DCE7E1' }]).map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span className="donut-center-label">{centerLabel}</span>
        <span className="donut-center-value">{centerValue}</span>
      </div>
    </motion.div>
  )
}
