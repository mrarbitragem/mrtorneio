import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/components/ui/chart-context";
import { getPayloadConfigFromPayload, useChart } from "@/components/ui/chart-context";

type TooltipItem = {
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
};

function TooltipIndicator({
  indicator,
  nestLabel,
  color,
}: {
  indicator: "line" | "dot" | "dashed";
  nestLabel: boolean;
  color: string;
}) {
  return (
    <div
      className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
        "h-2.5 w-2.5": indicator === "dot",
        "w-1": indicator === "line",
        "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
        "my-0.5": nestLabel && indicator === "dashed",
      })}
      style={{ "--color-bg": color, "--color-border": color } as React.CSSProperties}
    />
  );
}

function ChartTooltipItemBody({
  item,
  itemConfig,
  indicator,
  hideIndicator,
  nestLabel,
  tooltipLabel,
  indicatorColor,
}: {
  item: TooltipItem;
  itemConfig?: { label?: React.ReactNode; icon?: React.ComponentType };
  indicator: "line" | "dot" | "dashed";
  hideIndicator: boolean;
  nestLabel: boolean;
  tooltipLabel: React.ReactNode;
  indicatorColor: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
        indicator === "dot" && "items-center",
      )}
    >
      {itemConfig?.icon ? (
        <itemConfig.icon />
      ) : (
        !hideIndicator && (
          <TooltipIndicator indicator={indicator} nestLabel={nestLabel} color={indicatorColor} />
        )
      )}
      <div
        className={cn(
          "flex flex-1 justify-between leading-none",
          nestLabel ? "items-end" : "items-center",
        )}
      >
        <div className="grid gap-1.5">
          {nestLabel ? tooltipLabel : null}
          <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
        </div>
        {item.value ? (
          <span className="font-mono font-medium tabular-nums text-foreground">
            {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function resolveTooltipLabelValue(
  config: ChartConfig,
  item: TooltipItem,
  labelKey: string | undefined,
  label: unknown,
): React.ReactNode {
  const key = `${labelKey || item.dataKey || item.name || "value"}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);
  if (!labelKey && typeof label === "string") {
    return config[label as keyof typeof config]?.label || label;
  }
  return itemConfig?.label;
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();
    const items = React.useMemo(() => (payload ?? []) as TooltipItem[], [payload]);

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !items.length) return null;
      const value = resolveTooltipLabelValue(config, items[0], labelKey, label);
      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        );
      }
      if (!value) return null;
      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, items, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !items.length) return null;

    const nestLabel = items.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {items.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload?.fill || item.color || "";
            if (formatter && item.value !== undefined && item.name) {
              return (
                <React.Fragment key={String(item.dataKey)}>
                  {formatter(item.value, item.name, item, index, item.payload)}
                </React.Fragment>
              );
            }
            return (
              <ChartTooltipItemBody
                key={String(item.dataKey)}
                item={item}
                itemConfig={itemConfig}
                indicator={indicator}
                hideIndicator={hideIndicator}
                nestLabel={nestLabel}
                tooltipLabel={tooltipLabel}
                indicatorColor={indicatorColor}
              />
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";
