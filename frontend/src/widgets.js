import React from "react";
export const notification = msg => {
  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        borderRadius: "2px",
        textAlign: "center",
        color: "white",
        zIndex: 1000
      }}
    >
      <span
        style={{
          padding: "1em 5em",
          maxWidth: "50em",
          display: "inline-block",
          borderRadius: "1em",
          background: "rgba(0,0,0,0.5)"
        }}
      >
        {msg}
      </span>
    </div>
  );
};
