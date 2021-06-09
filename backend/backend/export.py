from tempfile import NamedTemporaryFile
from .db import Entry, Logbook
from .authentication import has_access
import sys
import time
import base64
import os
from flask import current_app
from weasyprint import HTML, CSS
import re
import zipfile

HTML_HEADER = "<html><head><meta charset='utf-8'><style>a{color: #0c879e}; a:hover{color: #0b9ab5} table{border: 1px solid #aaa; border-collapse: collapse;} th{border: 1px solid #aaa;} td{border: 1px solid #aaa;} ul{background: #f0f0f0; padding: 1em 3em;} a[href]:hover{text-decoration: underline} a[href] {text-decoration: none; color: #3962a5} h3 {margin: 0em 0em 0.3em 0em; display: inline-block;} body {font-family: Avenir, Helvetica, Arial; sans-serif;} .float-right {float: right} .container{max-width: 1200px; margin: auto;} .content {padding: 1em} .attachments {border-bottom: 1px solid #ccc; font-weight: bold} .inline-image {max-width: 100%} .followup{border-left: 5px solid #ccc; margin-left: 0.5em; padding-left: 0.5em} .subtitle {font-size: 0.9em;} .meta{color: #005867; margin-top: 0.5em; border-radius: 1px; border: 1px solid #d3e3e4; background: #e7f0f1; padding: 0.5em;} .entry{background: #fff}</style></head><body><div class='container'>"
HTML_FOOTER = "</div></body></html>"

def export_logbook_as_html(logbook_id, include_attachments):
    """
    Exports a logbook as a html file
    """
    logbook = Logbook.get(Logbook.id == logbook_id)
    if not has_access(logbook_id=logbook_id):
        raise Exception("401")
    table_of_content = "<div><h2>Logbook " + logbook.name + "</h2><ul>"
    html_body = ""
    for entry in logbook.get_all_entries(child_logbooks=True, followups=True):
        html_body = html_body + get_entry_as_html(entry)
        table_of_content   = table_of_content + "<li><a href='#" + str(entry.id) + "'>" + (entry.title or "(No title)") + "</a> </li>"
    table_of_content = table_of_content + "</ul></div>"
    file_id = str(logbook_id) + '_' + str(int(round(time.time() * 1000)))
    html_file = '/tmp/' + file_id + '.html'
    zip_file = "/tmp/"  + file_id + ".zip"
    with open(html_file, 'w') as f:
        f.write(HTML_HEADER + table_of_content + html_body + HTML_FOOTER)
    if include_attachments:
        zip_html_and_attachments(html_file, "logbook_" + str(logbook.id) + '.html', logbook.get_all_attachments(), zip_file)
        return zip_file
    return html_file

def get_attachment_base64(attachment_path):
    if attachment_path is not None and not attachment_path.startswith("/"):
        attachment_path = "/" + attachment_path
    filename = current_app.config["UPLOAD_FOLDER"] + attachment_path
    # filename = os.path.join(current_app.config["UPLOAD_FOLDER"], attachment_path)
    # print(filename, file=sys.stdout)
    try:
        with open(filename, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('ascii')
    except Exception:
        return ""

def get_entry_as_html(entry):
    """
    Exports an elogy entry as a html
    """
    attach_sources = re.findall('src="/attachments([^"]+)"', entry.content)
    base_url = current_app.config["BASEURL"]
    # attach_sources = re.findall('(src="/attachments([^"]+)")|(src=\'/attachments([^"]+)\')', entry.content)
    new_content = entry.content
    for attach_source in attach_sources:
        base64 = get_attachment_base64(attach_source)
        new_content = new_content.replace('src="/attachments' + attach_source, 'class="inline-image" src="data:image/png;base64, ' + base64)
    

    # attach_sources2 = re.findall("src='/attachments([^']+)'", entry.content)
    # for attach_source in attach_sources2:
    #     base64 = get_attachment_base64(attach_source)
    #     new_content = new_content.replace("src='/attachments" + attach_source, "class='inline-image' src='data:image/png;base64, " + base64)

    entry_html = "<div class='meta'><h3><a name='{id}'>{title}</a></h3><div class='subtitle float-right'><a href=\"{base_url}/logbooks/{logbook_id}/entries/{id}/\">{base_url}/logbooks/{logbook_id}/entries/{id}/</a></div><div class='subtitle'>Created {created_at} by {authors}</div></div><div class='content'>{content}</div>".format(title=entry.title or "(No title)",
                authors=", ".join(a["name"] for a in entry.authors),
                created_at=entry.created_at.strftime('%Y-%m-%d %H:%M'),
                id=entry.id,
                logbook_id=entry.logbook_id,
                content=new_content or "---",
                base_url=base_url)
    for followup in entry.followups:
        entry_html = entry_html + "<div class='followup'><div class='meta'>Followup created {created_at} by {authors}</div><div class='content'>{content}</div></div>".format(
                authors=", ".join(a["name"] for a in followup.authors),
                created_at=followup.created_at.strftime('%Y-%m-%d %H:%M'),
                content=followup.content or "---")
    # We now ignore the attachments in the html file, since they're added to the zip file instead
    # attachments = entry.get_attachments()
    # filtered_attachments = [x for x in attachments if x.content_type is not None and x.content_type.startswith("image")]
    # if filtered_attachments:
    #     entry_html = entry_html + "<div class='attachments'>Attachments</div>"
    # for attachment in filtered_attachments:
    #     entry_html = entry_html + "<img class='inline-image' src='data:image/png;base64, " + str(get_attachment_base64(attachment.path)) + "'/>"
    return "<div class='entry'>" + entry_html + "</div>"
    
def export_entry_as_html(entry_id, include_attachments):

    """
    Exports an elogy entry as a pdf
    """
    entry = Entry.get(Entry.id == entry_id)
    file_id = str(entry_id) + '_' + str(int(round(time.time() * 1000)))
    html_file = '/tmp/' + file_id + '.html'
    zip_file = "/tmp/"  + file_id + ".zip"
    with open(html_file, 'w') as f:
        f.write(HTML_HEADER + get_entry_as_html(entry) + HTML_FOOTER)
    if include_attachments:
        zip_html_and_attachments(html_file, "entry_" + str(entry.id) + '.html', entry.get_attachments(), zip_file)
        return zip_file
    return html_file

def zip_html_and_attachments(html_file, html_file_name, attachments, destination):
    root_dir = current_app.config["UPLOAD_FOLDER"]
    with zipfile.ZipFile(destination, mode='w') as zip_file:
        for attachment in attachments:
            try:
                filename = os.path.join(root_dir, attachment.path)
                zip_file.write(filename, filename[filename.rfind("/") + 1:])
            except Exception:
                pass
            
        zip_file.write(html_file, html_file_name)
