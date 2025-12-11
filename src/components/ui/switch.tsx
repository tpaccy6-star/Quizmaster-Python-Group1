"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-400 dark:data-[state=unchecked]:bg-gray-500 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.25rem] w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:opacity-90",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white border-2 border-gray-300 dark:border-gray-400 data-[state=checked]:border-green-600 data-[state=checked]:bg-white pointer-events-none block size-4.5 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-3px)] data-[state=unchecked]:translate-x-0 shadow-md",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
