from tempfile import NamedTemporaryFile
from .db import Entry, Logbook
import sys
import time
import base64
import os
from flask import current_app
from weasyprint import HTML, CSS

HTML_HEADER = "<html><head><meta charset='utf-8'><style>h3 {margin: 0em 0em 0.3em 0em; display: inline-block;} body {font-family: Avenir, Helvetica, Arial; sans-serif;} .float-right {float: right} .container{max-width: 1200px; margin: auto;} .content {padding: 1em} .attachments {border-bottom: 1px solid #ccc; font-weight: bold} .inline-image {max-width: 100%} .followup{border-left: 5px solid #ccc; margin-left: 0.5em; padding-left: 0.5em} .subtitle {font-size: 0.9em;} .meta{margin-top: 0.5em; border-radius: 2px; border: 1px solid #fbfb8b; background: #ffffdb; padding: 0.5em;}</style></head><body><div class='container'>"
HTML_FOOTER = "</div></body></html>"

def export_logbook_as_html(logbook_id):
    """
    Exports a logbook as a html file
    """
    logbook = Logbook.get(Logbook.id == logbook_id)
    html_body = ""
    for entry in logbook.get_entries():
        html_body = html_body + get_entry_as_html(entry)
    filename = '/tmp/' + str(logbook_id) + '_' + str(int(round(time.time() * 1000))) + '.html'
    with open(filename, 'w') as f:
        f.write(HTML_HEADER + html_body + HTML_FOOTER)
    return filename

def get_attachment_base64(attachment):
    filename = os.path.join(current_app.config["UPLOAD_FOLDER"], attachment.path)
    # return filename
    try:
        with open(filename, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('ascii')
    except Exception:
        return ""

def get_entry_as_html(entry):
    """
    Exports an elogy entry as a html
    """
    entry_html = "<div class='meta'><h3>{title}</h3><div class='subtitle float-right'><a href=\"https://elogy.maxiv.lu.se/logbooks/{logbook_id}/entries/{id}/\">elogy.maxiv.lu.se/logbooks/{logbook_id}/entries/{id}/</a></div><div class='subtitle'>Created {created_at} by {authors}</div></div><div class='content'>{content}</div>".format(title=entry.title or "(No title)",
                authors=", ".join(a["name"] for a in entry.authors),
                created_at=entry.created_at.strftime('%Y-%m-%d %H:%M'),
                id=entry.id,
                logbook_id=entry.logbook_id,
                content=entry.content or "---")
    for followup in entry.followups:
        entry_html = entry_html + "<div class='followup'><div class='meta'>Followup created {created_at} by {authors}</div><div class='content'>{content}</div></div>".format(
                authors=", ".join(a["name"] for a in followup.authors),
                created_at=followup.created_at.strftime('%Y-%m-%d %H:%M'),
                content=followup.content or "---")
    attachments = entry.get_attachments()
    if attachments:
        entry_html = entry_html + "<div class='attachments'>Attachments</div>"
    for attachment in attachments:
        entry_html = entry_html + "<img class='inline-image' src='data:image/png;base64, " + str(get_attachment_base64(attachment)) + "'/>"
    return entry_html
    
def export_entry_as_html(entry_id):

    """
    Exports an elogy entry as a pdf
    """
    entry = Entry.get(Entry.id == entry_id)
    filename = '/tmp/' + str(entry_id) + '_' + str(int(round(time.time() * 1000))) + '.html'
    with open(filename, 'w') as f:
        f.write(HTML_HEADER + get_entry_as_html(entry) + HTML_FOOTER)

    return filename
