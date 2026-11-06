"use client";
import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
export type ChartConfig = Record<string, { label: string; color: string }>;
export function ChartContainer({ config, children, className, ...props }: React.ComponentProps<"div"> & { config: ChartConfig; children: React.ComponentProps<typeof ResponsiveContainer>["children"] }) {
  return <div data-slot="chart" className={cn("chart-container", className)} style={Object.fromEntries(Object.entries(config).map(([name, item]) => [`--color-${name}`, item.color])) as React.CSSProperties} {...props}><ResponsiveContainer width="100%" height="100%" minWidth={0}>{children}</ResponsiveContainer></div>;
}
