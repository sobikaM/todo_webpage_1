import React from "react";

export default function Column({ title, children }) {
  return (
    <div className="column">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
