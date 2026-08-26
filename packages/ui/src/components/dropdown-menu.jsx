"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "#lib/utils";

function DropdownMenu(props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuTrigger({ className, ...props }) {
  return (
    <Menu.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

function DropdownMenuContent({
  align = "end",
  className,
  sideOffset = 4,
  ...props
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        align={align}
        className="z-50 outline-none"
        sideOffset={sideOffset}
      >
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-36 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[transform,scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuItem({ className, ...props }) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex min-h-9 cursor-default items-center rounded-md px-2 py-1.5 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, ...props }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5 text-sm font-medium", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      role="separator"
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
