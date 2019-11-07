import React from "react";

const EntryAttribute = ({ config, value }) => {
  let renderValue = value;
  switch (config.type) {
    case "multioption":
            renderValue = value.map(v => (
        <span key={v} className="option">
          {v}
        </span>
      ));
      break;
    case "boolean":
            renderValue = value ? "True" : "False";
            break;
    default:
            renderValue = value;
            break;
  }
  return (
    <span className="attribute">
      <span className="name">{config.name}</span>
      <span className="value">
        {renderValue}
      </span>
    </span>
  );
};

const EntryAttributes = ({ attributes, logbook }) => (
  <div className="attributes">
    {logbook.attributes
      .filter(attr => attributes[attr.name])
      .map((attr, i) => (
        <EntryAttribute key={i} config={attr} value={attributes[attr.name]} />
      ))}
  </div>
);

export default EntryAttributes;
