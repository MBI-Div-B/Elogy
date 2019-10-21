from tempfile import NamedTemporaryFile

import sys
from weasyprint import HTML, CSS

def export_entries_as_pdf(entry):

    """
    Exports an elogy entry as a pdf
    """

    filename = '/tmp/' + str(entry.id) + '.pdf'
    html_header = "<html><head><style></style></head><body>"
    html_footer = "</body></html>"
    entry_html = "<div><p><b>URL:</b> <a href=\"elogy.maxiv.lu.se/logbooks/{logbook_id}/entries/{id}/\">elogy.maxiv.lu.se/logbooks/{logbook_id}/entries/{id}/</a></p><p><b>Created at:</b> {created_at}</p><p><b>Title:</b> {title}</p><p><b>Authors:</b> {authors}</p></div><div>{content}</div><hr/>".format(title=entry.title or "(No title)",
                   authors=", ".join(a["name"] for a in entry.authors),
                   created_at=entry.created_at,
                   id=entry.id,
                   logbook_id=entry.logbook_id,
                   content=entry.content or "---")
    for followup in entry.followups:
        entry_html = entry_html + "<div><b>Followup created at:</b> {created_at}</p><p><b>Authors:</b> {authors}</p></div><hr/><div>{content}</div>".format(
                authors=", ".join(a["name"] for a in followup.authors),
                created_at=followup.created_at,
                content=followup.content or "---")
    HTML(string=(html_header + entry_html + html_footer)).write_pdf(filename)
    return filename
