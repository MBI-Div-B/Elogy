import React from "react";
import { findDOMNode } from "react-dom";
import { formatDateTimeString } from "./util.js";

const ICON_CLASS_MAP = {
  "application/vnd.ms-excel": "fa fa-file-excel-o",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "fa fa-file-excel-o",
  "application/pdf": "fa fa fa-file-pdf-o",
  "text/plain": "fa fa-file-text-o",
  "text/csv": "fa fa-file-text-o",
  "application/zip": "fa fa-file-archive-o",
  // TODO: detect more file types
};

export const RemoteAttachmentPreview = ({ attachment }) => {
  // display an appropriate icon for the given attachment
  if (!attachment.content_type) {
    return <i className="fa fa-file-o fa-2x" />;
  }
  const contentType = attachment.content_type.split(";")[0].toLowerCase();
  if (ICON_CLASS_MAP[contentType]) {
    return <i className={ICON_CLASS_MAP[attachment.content_type] + " fa-2x"} />;
  }
  if (attachment.metadata && attachment.metadata.thumbnail_size) {
    return (
      <img
        src={attachment.thumbnail_link}
        width={attachment.metadata.thumbnail_size.width}
        height={attachment.metadata.thumbnail_size.height}
        alt={attachment.filename}
      />
    );
  }
  return <i className="fa fa-file-o fa-2x" />;
};

export class LocalAttachmentPreview extends React.Component {
  componentDidMount() {
    const image = findDOMNode(this.refs.image);
    if (image) {
      image.src = this.props.attachment.preview;
    }
  }

  render() {
    if (this.props.attachment.type.split("/")[0] === "image") {
      return <img width="100" ref="image" alt="" />;
    }
    const iconClass =
      ICON_CLASS_MAP[this.props.attachment.type] || "fa fa-file-o fa-2x";
    return <i className={iconClass} />;
  }
}

export const AttachmentPreviewIcon = ({ attachment }) =>
  attachment.link ? (
    <RemoteAttachmentPreview attachment={attachment} />
  ) : (
    <LocalAttachmentPreview attachment={attachment} />
  );

export const AttachmentPreview = ({ attachment }) => (
  <div>
    <div className="preview" style={{ display: "inline-block" }}>
      <a href={attachment.link}>
        <span style={{fontSize: "2em"}}><AttachmentPreviewIcon attachment={attachment} /></span>
      </a>
    </div>
    <div style={{ display: "inline-block", verticalAlign: "top", marginLeft: "0.2em", maxWidth: "65%", overflow: "hidden" }}>
      <div className="filename">
        <a href={attachment.link}>{attachment.filename}</a>
      </div>
      <div className="timestamp">
        {attachment.timestamp ? formatDateTimeString(attachment.timestamp) : ""}
      </div>
      <div className="size">
        {attachment.metadata && attachment.metadata.size
          ? `${attachment.metadata.size.width}⨯${attachment.metadata.size.height}`
          : ""}
      </div>
    </div>
  </div>
);

export const EntryAttachments = ({ attachments, onRemove }) => {
  return (
    <div className="attachments">
      {attachments.map((att, i) => {
        //if the attachment has no longer been uploaded yet it is of type File, which has different attributes
        //if file, we only print the name. Otherwise we show the preview and metadata with the <AttachmentPreview> comp.
        const isFile = typeof att.name === "string";
        return (
          <div className="attachment" key={i} title={att.filename}>
            {onRemove ? (
              <div className="attachment-delete">
                <button
                  style={{
                    position: "absolute",
                    top: "0em",
                    left: "0em",
                    padding: ".2rem .5rem",
                  }}
                  className="btn btn-danger btn-xs"
                  title="Delete the attachment"
                  onClick={onRemove.bind(this, i)}
                >
                  {" "}
                  x{" "}
                </button>{" "}
              </div>
            ) : null}
            {isFile ? (
              <span style={{ marginLeft: "2em" }}>{att.name}</span>
            ) : (
              <AttachmentPreview attachment={att} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EntryAttachments;
