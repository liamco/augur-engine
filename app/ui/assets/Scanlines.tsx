import React from "react";

const classNames =
    "fixed w-full h-full top-0 bottom-0 left-0 right-0 pointer-events-none opacity-[5%]";

const Scanlines = () => {
    return (
        <div
            className={classNames}
            style={{
                mixBlendMode: "darken",
                backgroundImage:
                    "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAGCAYAAAAG5SQMAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAMElEQVQImWP8/////8LCQgYQYAKTDAwM////Z2D++PFjA4jDyMjIwAgShMnClWFwAPtjDK016jvhAAAAAElFTkSuQmCC)",
            }}
        />
    );
};

export default Scanlines;
