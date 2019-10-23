import React from "react";
export const bottomLabel = msg => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "2em",
        left: "0em",
        right: "0em",
        borderRadius: "2px",
        textAlign: "center",
        color: "white"
      }}
    >
      <span style={{ padding: "1em 5em", background: "rgba(0,0,0,0.5)" }}>
        {msg}
      </span>
    </div>
  );
};
