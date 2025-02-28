import React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  type: "bar" | "pie";
  data: Array<{ name: string; count: number }>;
  xKey: string;
  yKey: string;
  nameFormatter?: (name: string) => string;
  colorScheme?: string[];
}

export const Chart: React.FC<ChartProps> = ({
  type,
  data,
  xKey,
  yKey,
  nameFormatter = (name) => name,
  colorScheme = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#818CF8"],
}) => {
  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tickFormatter={nameFormatter}
            className="dark:text-gray-400"
          />
          <YAxis className="dark:text-gray-400" />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "none",
              borderRadius: "4px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
            formatter={(value: number) => [value, "Tasks"]}
            labelFormatter={nameFormatter}
          />
          <Bar dataKey={yKey} fill={colorScheme[0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          nameKey={xKey}
          dataKey={yKey}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, value }) => `${nameFormatter(name)}: ${value}`}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colorScheme[index % colorScheme.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            border: "none",
            borderRadius: "4px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
          formatter={(value: number) => [value, "Tasks"]}
          labelFormatter={nameFormatter}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
