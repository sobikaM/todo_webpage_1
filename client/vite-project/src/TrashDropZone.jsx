// src/components/TrashDropZone.jsx
import React from "react";

export default function TrashDropZone({ onCardDrop }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("card"));
    onCardDrop(data);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="trash-drop-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      🗑️ Drop here to delete
    </div>
  );
}
