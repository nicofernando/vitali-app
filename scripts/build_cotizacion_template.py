"""
Genera un .docx mínimo válido con sintaxis Carbone para usar como template
de cotización. Sin dependencias externas — solo zipfile + strings XML.

Uso:
    python scripts/build_cotizacion_template.py [output_path]

Default output: ./cotizacion.docx (en cwd)

Sintaxis Carbone: variables como {d.cliente.nombre}, {d.proyecto.nombre}, etc.
El motor inyecta el objeto data como `d`.
"""

import sys
import zipfile
from pathlib import Path

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""


def make_paragraph(text: str, bold: bool = False, size_pt: int | None = None) -> str:
    """Construye un párrafo Word con un texto. Carbone parsea el contenido textual."""
    rpr_parts = []
    if bold:
        rpr_parts.append("<w:b/>")
    if size_pt is not None:
        rpr_parts.append(f'<w:sz w:val="{size_pt * 2}"/>')  # half-points
    rpr = f"<w:rPr>{''.join(rpr_parts)}</w:rPr>" if rpr_parts else ""
    # xml:space="preserve" para que Carbone vea los espacios en {d.x}
    return (
        f'<w:p><w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r></w:p>'
    )


def build_document_xml() -> str:
    paragraphs = [
        make_paragraph("COTIZACIÓN — Vitali Suites", bold=True, size_pt=18),
        make_paragraph(""),
        make_paragraph("Fecha: {d.cotizacion.fecha}"),
        make_paragraph(""),
        make_paragraph("CLIENTE", bold=True, size_pt=14),
        make_paragraph("Nombre: {d.cliente.nombre}"),
        make_paragraph("RUT: {d.cliente.rut}"),
        make_paragraph("Email: {d.cliente.email}"),
        make_paragraph(""),
        make_paragraph("PROYECTO", bold=True, size_pt=14),
        make_paragraph("Proyecto: {d.proyecto.nombre}"),
        make_paragraph("Torre: {d.torre.nombre}"),
        make_paragraph("Unidad N°: {d.unidad.numero}"),
        make_paragraph("Tipología: {d.unidad.tipologia}"),
        make_paragraph("Superficie: {d.unidad.superficie} m²"),
        make_paragraph(""),
        make_paragraph("CONDICIONES FINANCIERAS", bold=True, size_pt=14),
        make_paragraph("Precio lista: {d.proyecto.moneda.simbolo}{d.unidad.precio_lista}"),
        make_paragraph("Pie ({d.cotizacion.pie_pct}%): {d.proyecto.moneda.simbolo}{d.cotizacion.pie_monto}"),
        make_paragraph("Monto crédito: {d.proyecto.moneda.simbolo}{d.cotizacion.monto_credito}"),
        make_paragraph("Plazo: {d.cotizacion.plazo_anos} años"),
        make_paragraph("Tipo de crédito: {d.cotizacion.tipo_credito}"),
        make_paragraph(""),
        make_paragraph(
            "Cuota mensual (Francés): {d.proyecto.moneda.simbolo}{d.frances.cuota_mensual}"
        ),
        make_paragraph(
            "Cuota mensual (Inteligente): {d.proyecto.moneda.simbolo}{d.inteligente.cuota_mensual}"
        ),
        make_paragraph(
            "Pago globo (Inteligente): {d.proyecto.moneda.simbolo}{d.inteligente.globo}"
        ),
    ]
    body = "".join(paragraphs)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body>"
        "</w:document>"
    )


def main() -> None:
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("cotizacion.docx")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    document_xml = build_document_xml()

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", RELS)
        zf.writestr("word/document.xml", document_xml)

    size = out_path.stat().st_size
    print(f"Generado: {out_path} ({size} bytes)")


if __name__ == "__main__":
    main()
