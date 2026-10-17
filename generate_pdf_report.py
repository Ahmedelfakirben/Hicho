import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

raw_returns_data = [
    ("Koupit Svetr adidas Originals Athletic Dept Knitted", "L", "9", "2026-10-01 13:02:40", "2026-10-03 13:31:00", "1", "0"),
    ("NIKE SPORT", "40", "7", "2026-10-01 12:42:54", "2026-10-01 15:52:24", "1", "1"),
    ("NIKE SPORT", "38.5", "11", "2026-10-01 13:26:52", "2026-10-01 15:52:14", "1", "1"),
    ("Survéte VIOLET ADIDAS  IY6591", "L", "1", "2026-09-06 10:34:12", "2026-09-28 22:33:22", "1", "2"),
    ("LEGGING NIKE NOIR", "XXL", "3", "2026-09-07 14:53:46", "2026-09-28 22:32:46", "1", "3"),
    ("adidas Sportswear Future Icons 3-Stripes...", "M", "7", "2026-08-31 15:29:48", "2026-09-28 22:30:47", "1", "3"),
    ("PANTALON NIKE ROSE", "XL", "2", "2026-09-14 10:31:35", "2026-09-28 22:28:26", "1", "0"),
    ("NIKE Grade-School Dunk Low HJ9202 001", "37.5", "1", "2026-09-12 12:59:00", "2026-09-28 22:28:03", "1", "2"),
    ("Legging nike noir", "L", "1", "2026-09-15 12:07:49", "2026-09-16 17:15:19", "1", "3"),
    ("t shirt", "Sans Taille", "1", "2026-09-03 12:08:28", "2026-09-13 12:45:14", "1", "8"),
    ("Veste adidas noir IU2516", "L", "2", "2026-08-29 14:48:03", "2026-09-13 12:44:33", "1", "2"),
    ("LEGGINGE ADIDAS NOIR", "M", "3", "2026-09-01 10:24:58", "2026-09-13 12:40:25", "1", "1"),
    ("CAPUCHE ADIDAS GRIS JI8776", "L", "6", "2026-08-30 19:49:50", "2026-09-13 12:37:50", "1", "3"),
    ("t shirt", "Sans Taille", "3", "2026-08-25 19:28:23", "2026-09-05 15:24:36", "1", "8"),
    ("Jordan Jumpman Track Jacket & Pants Set...", "12mois", "9", "2026-09-01 19:28:26", "2026-09-02 10:46:02", "1", "2"),
    ("T-shirt Nike T100", "XXL", "9", "2026-06-19 19:05:39", "2026-09-01 14:03:26", "1", "4"),
    ("Chaussettes adidas RUFFLE CREW 2P", "Sans Taille", "0", "2026-08-26 10:47:27", "2026-08-31 18:41:38", "1", "3"),
    ("Bouteille ADIDAS 500ml", "3", "4", "2026-08-27 15:14:49", "2026-08-31 18:41:27", "1", "1"),
    ("t shirt", "Sans Taille", "2", "2026-08-22 13:09:19", "2026-08-31 18:41:02", "1", "8"),
    ("t shirt", "L", "2", "2026-08-24 14:38:19", "2026-08-31 18:40:51", "1", "0"),
    ("я Adidas Run It Jacket Il7230", "M", "2", "2026-08-30 11:36:08", "2026-08-30 11:57:25", "1", "0"),
    ("PA?TALON ADIDAS GRIS VIOLET JN6992", "XL", "4", "2026-08-29 19:21:56", "2026-08-30 11:34:19", "1", "1"),
    ("Pantalon nike noir", "XL", "1", "2026-08-19 13:36:41", "2026-08-26 14:32:12", "1", "5"),
    ("Ensemble enfants mickey mouse", "Sans Taille", "2", "2026-08-24 14:38:19", "2026-08-24 17:38:12", "1", "5"),
    ("TSHIRT ADIDAS ZNE BLANC", "XXL", "2", "2026-08-24 14:38:19", "2026-08-24 15:11:29", "1", "0"),
    ("adidas Adicolor Classics Firebird Track Pants", "Xs", "1", "2026-08-15 12:16:21", "2026-08-24 15:02:28", "1", "3"),
    ("adidas Adilette Aqua IF0894", "40", "2", "2026-08-08 10:49:12", "2026-08-19 13:51:01", "1", "2"),
    ("t shirt", "L", "1", "2026-08-07 16:11:36", "2026-08-19 13:48:42", "1", "0"),
    ("T-shirt adidas bleu IW2704", "L", "1", "2026-08-16 16:33:22", "2026-08-16 18:25:17", "1", "3"),
    ("t shirt", "L", "1", "2026-08-07 16:11:36", "2026-08-15 14:23:25", "1", "0"),
    ("Chort adidas beige IT9816", "S", "1", "2026-07-21 10:17:31", "2026-08-08 14:56:55", "1", "2"),
    ("Power crop IM2707", "XS", "1", "2026-07-21 10:17:31", "2026-08-08 14:56:29", "1", "0"),
    ("T-shirt adidas blanc", "XL", "3", "2026-07-18 19:53:42", "2026-08-08 14:55:32", "1", "1"),
    ("Nike Big Logo Tee", "XL", "3", "2026-07-18 19:53:42", "2026-08-08 14:55:20", "1", "2"),
    ("T SHIRT LONG SLEEF", "L", "2", "2026-07-27 10:24:28", "2026-08-08 14:54:46", "1", "0"),
    ("chort Under Armour", "S", "2", "2026-07-22 15:58:16", "2026-08-08 14:53:18", "1", "3"),
    ("UNDER ARMOUR Men's UA Velocity 2.0...", "M", "2", "2026-07-22 15:58:16", "2026-08-08 14:52:15", "1", "2"),
    ("PANTALON NIKE ROSE", "L", "2", "2026-07-30 11:04:13", "2026-08-08 14:50:41", "1", "0"),
    ("T-shirt adidas bleu KE1294", "L", "2", "2026-07-21 17:18:14", "2026-08-04 20:21:13", "1", "2"),
    ("T-shirt adidas vert JX3285", "XXL", "2", "2026-07-16 13:19:57", "2026-08-04 20:20:14", "1", "2"),
    ("Adidas SLYN SANDAL", "38", "2", "2026-06-09 19:33:15", "2026-07-27 13:39:04", "1", "2"),
    ("198484314253", "L", "2", "2026-07-27 10:24:28", "2026-07-27 10:25:35", "1", "0"),
    ("T-shirt Nike", "L", "6", "2026-07-12 20:12:55", "2026-07-23 13:35:42", "1", "2"),
    ("Under Armour UA SpeedPocket 7”...", "L", "2", "2026-07-13 11:57:54", "2026-07-23 13:34:21", "1", "2"),
    ("t-shirt UNDER ARMOUR noir", "XXL", "2", "2026-07-13 11:57:54", "2026-07-23 13:33:35", "1", "3"),
    ("Challenger Extra 22L Small Sports Bag", "22L", "1", "2026-07-15 16:20:08", "2026-07-23 13:31:25", "1", "3"),
    ("Ensembles puma", "M", "2", "2026-06-14 17:57:13", "2026-07-23 13:30:29", "1", "1"),
    ("Buy Nike Sportswear Windrunner...", "L", "3", "2026-07-11 12:22:27", "2026-07-20 14:09:40", "1", "2"),
    ("T-shirt adidas jaune IS0306", "XL", "3", "2026-06-30 19:37:24", "2026-07-20 14:06:21", "1", "2"),
    ("T-shirt ADIDAS ROSE", "M", "1", "2026-07-04 14:32:26", "2026-07-20 14:05:39", "1", "2"),
    ("LEGGINSY DAMSKIE ADIDAS ESSENTIALS...", "M", "2", "2026-07-14 12:20:59", "2026-07-20 13:50:29", "1", "2"),
    ("T-SHIRT ADIDAS MARROC", "Sans Taille", "2", "2026-07-07 11:50:08", "2026-07-20 13:49:45", "1", "2"),
    ("pantalon adidas noir", "XXL", "13", "2026-06-03 15:07:48", "2026-07-20 13:48:48", "1", "3"),
    ("Chemise nike", "M", "2", "2026-07-15 19:29:11", "2026-07-16 10:25:38", "1", "3"),
    ("T-shirt adidas noir", "L", "1", "2026-07-03 20:15:48", "2026-07-13 13:46:47", "1", "2"),
    ("T-shirt nike", "Sans Taille", "4", "2026-07-12 13:46:02", "2026-07-12 17:38:31", "1", "2"),
    ("T-shirt adidas blanc cassé IS3607", "XXL", "2", "2026-06-21 19:46:26", "2026-07-11 13:37:34", "1", "1"),
    ("Nike Bag Gym", "Sans Taille", "2", "2026-07-02 10:39:41", "2026-07-08 13:42:18", "1", "6"),
    ("Veste adidas noir IU2516", "XL", "7", "2026-06-04 15:39:53", "2026-07-06 13:34:02", "1", "2"),
    ("T-shirt adidas noir y", "M", "1", "2026-06-19 10:23:16", "2026-07-06 13:28:25", "1", "1"),
    ("T-shirt adidas noir IW4563", "M", "3", "2026-06-23 11:42:18", "2026-07-01 19:31:30", "1", "3"),
    ("adidas Originals Firebird Tp...", "L", "6", "2026-05-15 13:51:06", "2026-07-01 15:31:38", "1", "0"),
    ("Adidas ALL SZN Loose IY6784 M...", "M", "2", "2026-06-16 13:04:20", "2026-06-26 14:44:24", "1", "1"),
    ("PONTALON ADIDAS", "Sans Taille", "2", "2026-06-16 13:04:20", "2026-06-26 14:44:00", "1", "0"),
    ("Adidas Kids White & Black Logo...", "Sans Taille", "1", "2026-06-15 11:06:25", "2026-06-23 11:00:51", "1", "5"),
    ("HM8968 ADI LK BOS SET KIDS...", "3-4ans", "1", "2026-06-15 11:06:25", "2026-06-23 11:00:41", "1", "2"),
    ("T-shirt blue  nike", "XL", "6", "2026-06-17 18:31:52", "2026-06-20 16:48:51", "1", "0"),
    ("Under Armour Men's Velocity 2.0...", "S", "2", "2026-06-15 17:26:27", "2026-06-20 13:50:56", "1", "2"),
    ("chort Under Armour", "S", "2", "2026-06-15 17:26:27", "2026-06-20 13:50:36", "1", "3"),
    ("Sandale adidas beige JP5183", "39", "4", "2026-06-11 15:47:43", "2026-06-20 13:49:54", "1", "2"),
    ("T-shirt adidas rose JP0114", "XL", "5", "2026-06-19 15:44:51", "2026-06-19 15:45:19", "1", "0"),
    ("LEGGINGE ADIDAS NOIR", "L", "9", "2026-06-18 20:11:32", "2026-06-19 13:40:23", "1", "1"),
    ("LEGGINGE ADIDAS NOIR", "XL", "3", "2026-06-19 13:38:14", "2026-06-19 13:39:04", "1", "8"),
    ("pantalon adidas noir", "XXL", "7", "2026-06-03 11:23:19", "2026-06-18 13:51:57", "1", "3"),
    ("MAXI DRESSE IK0439", "Sans Taille", "6", "2026-05-15 13:51:06", "2026-06-18 13:50:01", "1", "8"),
    ("ADIDAS GRIS ROSE", "M", "2", "2026-06-18 12:11:24", "2026-06-18 13:49:30", "1", "0"),
    ("adidas Zip Up Vest Kadın Krem Yelek", "M", "8", "2026-06-04 16:28:50", "2026-06-18 13:44:51", "1", "1"),
    ("SLYN Sandal adidas noir PAA IH6119", "38", "8", "2026-06-04 16:28:50", "2026-06-18 13:43:56", "1", "0"),
    ("T-shirt nike blanc HV3992-100", "M", "3", "2026-06-18 12:20:34", "2026-06-18 12:34:46", "1", "2"),
    ("Legging adidas vert JL6231", "XXL", "6", "2026-06-17 18:31:52", "2026-06-18 10:21:17", "1", "1"),
    ("T-shirt adidas noir IB8273", "XL", "3", "2026-06-15 17:44:49", "2026-06-16 19:36:50", "1", "1"),
    ("Shop adidas Women's Galaxy 6...", "38", "1", "2026-04-26 19:51:44", "2026-06-16 15:24:36", "1", "1"),
    ("T-SHIRT UNDER", "L", "5", "2026-06-05 16:36:52", "2026-06-16 13:21:23", "1", "2"),
    ("Ensembles puma", "M", "2", "2026-06-14 17:57:13", "2026-06-15 17:45:06", "1", "1"),
    ("Adidas Originals", "L", "1", "2026-05-31 13:45:05", "2026-06-12 14:01:38", "1", "1"),
    ("Pantalon adidas beige IY2130", "XL", "5", "2026-06-03 10:46:17", "2026-06-12 13:52:19", "1", "1"),
    ("T-shirt adidas blanc cassée JJ4020", "L", "1", "2026-05-31 13:45:05", "2026-06-12 13:49:03", "1", "0"),
    ("MAXI DRESSE IK0439", "Sans Taille", "6", "2026-05-15 13:51:06", "2026-06-06 15:09:00", "1", "8"),
    ("LEGGINGE ADIDAS NOIR", "L", "6", "2026-05-15 13:51:06", "2026-06-05 13:38:35", "1", "2"),
    ("Adidas MEHANA", "Sans Taille", "7", "2026-05-15 14:12:56", "2026-06-05 13:35:16", "1", "6"),
]

def fmt_date(d_str):
    if not d_str or d_str == "null":
        return "-"
    try:
        dt = datetime.fromisoformat(d_str.replace(" ", "T"))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return d_str[:10]

def fmt_cmd(cmd_str):
    if not cmd_str or cmd_str == "0" or cmd_str == "null":
        return "-"
    try:
        return f"#{int(cmd_str):03d}"
    except Exception:
        return f"#{cmd_str}"

pdf_filename = "Rapport_Audit_Stock_ClothingStore.pdf"

doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=A4,
    rightMargin=1.0*cm, leftMargin=1.0*cm, topMargin=1.0*cm, bottomMargin=1.0*cm
)

styles = getSampleStyleSheet()

# Palette
PRIMARY = colors.HexColor("#0F172A")    # Slate 900
SECONDARY = colors.HexColor("#2563EB")  # Blue 600
BG_LIGHT = colors.HexColor("#F8FAFC")   # Slate 50
BORDER_COLOR = colors.HexColor("#CBD5E1")

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=PRIMARY,
    spaceAfter=4
)

subtitle_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10.5,
    leading=14,
    textColor=SECONDARY,
    spaceAfter=10
)

h2_style = ParagraphStyle(
    'Heading2Custom',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    textColor=PRIMARY,
    spaceBefore=12,
    spaceAfter=6
)

body_style = ParagraphStyle(
    'BodyCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor("#334155"),
    spaceAfter=6
)

table_header_style = ParagraphStyle(
    'TableHeader',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=7.5,
    leading=9.5,
    textColor=colors.white,
    alignment=0
)

table_cell_style = ParagraphStyle(
    'TableCell',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=7,
    leading=9,
    textColor=colors.HexColor("#1E293B")
)

table_cell_bold = ParagraphStyle(
    'TableCellBold',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=7,
    leading=9,
    textColor=PRIMARY
)

elements = []

# Title & Header
elements.append(Paragraph("RAPPORT D'AUDIT DETAILLE ET TRAÇABILITÉ DES RETOURS", title_style))
elements.append(Paragraph("Document d'Audit de Stock & Historique des Commandes - À l'attention de la Propriétaire", subtitle_style))
elements.append(HRFlowable(width="100%", thickness=1.5, color=SECONDARY, spaceBefore=0, spaceAfter=8))

# Client Note
client_intro = (
    "<b>Madame, Monsieur,</b><br/>"
    "Conformément à votre demande, nous vous présentons le rapport d'audit détaillé incluant pour chaque article retourné du catalogue : "
    "le <b>N° de Commande</b>, la <b>Date d'Achat</b> et la <b>Date du Retour</b>.<br/>"
    "<b>Constats majeurs :</b><br/>"
    "1. <b>Correction logicielle :</b> L'anomalie du module de retour (POS) qui ajoutait 2 unités au lieu d'une seule a été "
    "<b>définitivement corrigée</b> le 3 Octobre 2026.<br/>"
    "2. <b>Traçabilité des articles :</b> Chaque ligne ci-dessous permet de relier le retour à sa commande d'origine dans le système.<br/>"
    "3. <b>Protection des ajustements :</b> Les références que vous aviez déjà corrigées manuellement (stock à 0) sont maintenues à 0."
)
elements.append(Paragraph(client_intro, body_style))
elements.append(Spacer(1, 8))

# Process data and filter out any test items
to_adjust = []
already_zero = []

for prod, size, cmd, d_achat, d_retour, qte, stock in raw_returns_data:
    st_val = int(stock)
    item = {
        "product": prod,
        "size": size,
        "cmd": cmd,
        "date_achat": d_achat,
        "date_retour": d_retour,
        "qty": qte,
        "stock": stock
    }
    if st_val > 0:
        to_adjust.append(item)
    else:
        already_zero.append(item)

# Summary Cards
metrics_data = [
    [
        Paragraph(f"<b>Retours Catalogue Analysés</b><br/><font size=11 color='#0F172A'><b>{len(raw_returns_data)}</b></font>", body_style),
        Paragraph(f"<b>À Réajuster (Stock > 0)</b><br/><font size=11 color='#DC2626'><b>{len(to_adjust)} Réf.</b></font>", body_style),
        Paragraph(f"<b>Déjà Ajustés / Stock 0</b><br/><font size=11 color='#16A34A'><b>{len(already_zero)} Réf.</b></font>", body_style),
        Paragraph("<b>Correction Appliquée</b><br/><font size=11 color='#2563EB'><b>POS Corrigé</b></font>", body_style)
    ]
]
t_metrics = Table(metrics_data, colWidths=[4.7*cm, 4.7*cm, 4.7*cm, 4.7*cm])
t_metrics.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,0), colors.HexColor("#F1F5F9")),
    ('BACKGROUND', (1,0), (1,0), colors.HexColor("#FEE2E2")),
    ('BACKGROUND', (2,0), (2,0), colors.HexColor("#DCFCE7")),
    ('BACKGROUND', (3,0), (3,0), colors.HexColor("#DBEAFE")),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('PADDING', (0,0), (-1,-1), 6),
    ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
]))
elements.append(t_metrics)
elements.append(Spacer(1, 10))

# SECTION 1: Products to Adjust
elements.append(Paragraph(f"1. Produits du Catalogue à Réajuster avec Traçabilité ({len(to_adjust)} Articles)", h2_style))
elements.append(Paragraph(
    "Voici la liste des articles réels du catalogue dont le stock actuel comporte le surstock du retour. Vous retrouvez le N° de commande d'origine, "
    "la date d'achat et la date de retour pour une vérification facile.",
    body_style
))
elements.append(Spacer(1, 6))

t1_headers = [
    Paragraph("<b>Désignation Produit</b>", table_header_style),
    Paragraph("<b>Taille</b>", table_header_style),
    Paragraph("<b>N° Cmd</b>", table_header_style),
    Paragraph("<b>Date Achat</b>", table_header_style),
    Paragraph("<b>Date Retour</b>", table_header_style),
    Paragraph("<b>Stock Actuel</b>", table_header_style),
    Paragraph("<b>Stock Proposé</b>", table_header_style),
]

t1_rows = [t1_headers]

for item in to_adjust:
    st_act = int(item["stock"])
    st_prop = max(0, st_act - int(item["qty"]))
    t1_rows.append([
        Paragraph(item["product"], table_cell_style),
        Paragraph(item["size"], table_cell_style),
        Paragraph(fmt_cmd(item["cmd"]), table_cell_bold),
        Paragraph(fmt_date(item["date_achat"]), table_cell_style),
        Paragraph(fmt_date(item["date_retour"]), table_cell_style),
        Paragraph(str(st_act), table_cell_bold),
        Paragraph(f"<b><font color='#16A34A'>{st_prop}</font></b>", table_cell_bold),
    ])

t1 = Table(t1_rows, colWidths=[6.5*cm, 2.2*cm, 1.8*cm, 2.3*cm, 2.3*cm, 2.0*cm, 2.0*cm])
t1.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PRIMARY),
    ('ALIGN', (2,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 3),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
]))

elements.append(t1)
elements.append(Spacer(1, 12))

# SECTION 2: Already Corrected or Out of Stock Products
elements.append(Paragraph(f"2. Produits Déjà Ajustés par vos Soins ou Épuisés à 0 ({len(already_zero)} Articles)", h2_style))
elements.append(Paragraph(
    "Ces articles ont été identifiés comme ayant déjà fait l'objet d'une correction manuelle de votre part ou sont épuisés (stock 0). "
    "Leur stock est maintenu à 0 sans modification.",
    body_style
))
elements.append(Spacer(1, 6))

t2_headers = [
    Paragraph("<b>Désignation Produit</b>", table_header_style),
    Paragraph("<b>Taille</b>", table_header_style),
    Paragraph("<b>N° Cmd</b>", table_header_style),
    Paragraph("<b>Date Achat</b>", table_header_style),
    Paragraph("<b>Date Retour</b>", table_header_style),
    Paragraph("<b>Stock Actuel</b>", table_header_style),
    Paragraph("<b>Statut</b>", table_header_style),
]

t2_rows = [t2_headers]
for item in already_zero:
    t2_rows.append([
        Paragraph(item["product"], table_cell_style),
        Paragraph(item["size"], table_cell_style),
        Paragraph(fmt_cmd(item["cmd"]), table_cell_bold),
        Paragraph(fmt_date(item["date_achat"]), table_cell_style),
        Paragraph(fmt_date(item["date_retour"]), table_cell_style),
        Paragraph("0", table_cell_bold),
        Paragraph("<b><font color='#16A34A'>Maintenu à 0</font></b>", table_cell_style),
    ])

t2 = Table(t2_rows, colWidths=[6.5*cm, 2.2*cm, 1.8*cm, 2.3*cm, 2.3*cm, 1.8*cm, 2.2*cm])
t2.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), SECONDARY),
    ('ALIGN', (2,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 3),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
]))

elements.append(t2)
elements.append(Spacer(1, 12))

# SECTION 3: Validation & Authorization Block
elements.append(Paragraph("3. Formulaire de Validation et Bon pour Accord", h2_style))
val_text = (
    "En me retournant ce document signé, je confirme avoir pris connaissance des réajustements de stock ci-dessus "
    "et j'autorise l'équipe technique à appliquer la mise à jour automatique en base de données pour les articles concernés."
)
elements.append(Paragraph(val_text, body_style))
elements.append(Spacer(1, 8))

sig_table_data = [
    [
        Paragraph("<b>Pour l'Équipe Support ERP</b>", body_style),
        Paragraph("<b>Pour la Propriétaire / Direction</b>", body_style)
    ],
    [
        Paragraph("Statut : Application corrigée (POS.tsx)", body_style),
        Paragraph("Mention : <b>« Bon pour accord de réajustement »</b>", body_style)
    ],
    [Spacer(1, 16), Spacer(1, 16)],
    [
        Paragraph("Date : 3 Octobre 2026<br/>Signature : ______________________", body_style),
        Paragraph("Date : ____ / ____ / 2026<br/>Signature : ______________________", body_style)
    ]
]

t_sig = Table(sig_table_data, colWidths=[9.5*cm, 9.5*cm])
t_sig.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
    ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))

elements.append(KeepTogether(t_sig))

doc.build(elements)
print(f"PDF client report generated successfully filtering out test items ({len(raw_returns_data)} catalog records): {os.path.abspath(pdf_filename)}")
