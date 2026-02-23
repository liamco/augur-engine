import React from "react";
import clxs from "clsx";

enum Colors {
    "inherit" = "fill-inherit",
    "currentColor" = "fill-[currentColor]",
    "default" = "fill-skarsnikGreen",
    "deathWorldForest" = "fill-deathWorldForest",
    "fireDragonBright" = "fill-fireDragonBright",
    "wordBearersRed" = "fill-wordBearersRed",
    "mournfangBrown" = "fill-mournfangBrown",
    "wildRiderRed" = "fill-wildRiderRed",
    "skarsnikGreen" = "fill-skarsnikGreen",
}

enum Sizes {
    "xsmall" = "w-2 h-2",
    "small" = "w-3 h-3",
    "medium" = "w-4 h-4",
    "large" = "w-6 h-6",
    "xlarge" = "w-8 h-8",
}

interface Props {
    children: React.ReactNode;
    size?: keyof typeof Sizes;
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    color?: keyof typeof Colors;
    className?: string;
}

const BaseIcon = ({
    children,
    size = "medium",
    viewBox = "0 0 24 24",
    color = "default",
    className,
}: Props) => {
    const classNames = clxs(
        "inline-block pointer-events-none",
        className,
        Sizes[size],
        Colors[color],
    );
    return (
        <svg viewBox={viewBox} className={classNames}>
            {children}
        </svg>
    );
};

export default BaseIcon;
